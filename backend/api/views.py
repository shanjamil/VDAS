import json
import os

from django.contrib.auth import authenticate
import google.generativeai as genai
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import DiagnosisRequestSerializer, LoginSerializer, RegisterSerializer


REPAIR_DIFFICULTY_VALUES = {"DIY", "Professional"}
REQUIRED_DIAGNOSIS_FIELDS = {
    "fault_name",
    "component_id",
    "confidence",
    "probable_causes",
    "recommended_actions",
    "repair_difficulty",
    "repair_steps",
}


def first_serializer_error(serializer):
    return str(next(iter(serializer.errors.values()))[0])


def build_diagnosis_prompt(symptom):
    return f"""
You are the diagnostic engine for V-DAS, a vehicle diagnostic and assistance system.
Analyze this vehicle symptom and return one likely diagnosis.

Symptom:
{symptom}

Return ONLY valid JSON with exactly these fields:
{{
  "fault_name": "string",
  "component_id": "string",
  "confidence": 0,
  "probable_causes": ["string"],
  "recommended_actions": ["string"],
  "repair_difficulty": "DIY",
  "repair_steps": ["string"]
}}

Rules:
- confidence must be a number from 0 to 100.
- repair_difficulty must be either "DIY" or "Professional".
- component_id must be a short frontend-friendly identifier such as "brakes", "engine", "battery", "transmission", "cooling", "exhaust", "suspension", or "unknown".
- probable_causes, recommended_actions, and repair_steps must be non-empty arrays of strings.
- Do not include markdown, code fences, comments, or extra text.
""".strip()


def parse_gemini_json(raw_text):
    text = raw_text.strip()

    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1]).strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Gemini did not return a JSON object.")

    return json.loads(text[start : end + 1])


def validate_diagnosis_result(data):
    if not isinstance(data, dict):
        raise ValueError("Diagnosis result must be a JSON object.")

    missing = REQUIRED_DIAGNOSIS_FIELDS - set(data.keys())
    if missing:
        raise ValueError(f"Diagnosis result is missing: {', '.join(sorted(missing))}.")

    if not isinstance(data["fault_name"], str) or not data["fault_name"].strip():
        raise ValueError("fault_name must be a non-empty string.")
    if not isinstance(data["component_id"], str) or not data["component_id"].strip():
        raise ValueError("component_id must be a non-empty string.")
    if not isinstance(data["confidence"], (int, float)) or not 0 <= data["confidence"] <= 100:
        raise ValueError("confidence must be a number from 0 to 100.")
    if data["repair_difficulty"] not in REPAIR_DIFFICULTY_VALUES:
        raise ValueError('repair_difficulty must be either "DIY" or "Professional".')

    for field in ("probable_causes", "recommended_actions", "repair_steps"):
        values = data[field]
        if not isinstance(values, list) or not values:
            raise ValueError(f"{field} must be a non-empty array.")
        if not all(isinstance(item, str) and item.strip() for item in values):
            raise ValueError(f"{field} must contain only non-empty strings.")

    return {
        "fault_name": data["fault_name"].strip(),
        "component_id": data["component_id"].strip(),
        "confidence": round(float(data["confidence"]), 2),
        "probable_causes": [item.strip() for item in data["probable_causes"]],
        "recommended_actions": [item.strip() for item in data["recommended_actions"]],
        "repair_difficulty": data["repair_difficulty"],
        "repair_steps": [item.strip() for item in data["repair_steps"]],
    }


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "message": first_serializer_error(serializer)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "status": "success",
                "data": {
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                    },
                    "token": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "message": first_serializer_error(serializer)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        user = authenticate(request=request, email=email, password=password)

        if user is None:
            return Response(
                {"status": "error", "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "status": "success",
                "data": {
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                    },
                    "token": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )


class DiagnoseView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = DiagnosisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "message": first_serializer_error(serializer)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return Response(
                {"status": "error", "message": "GEMINI_API_KEY is not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        symptom = serializer.validated_data["symptom"]

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                generation_config={
                    "temperature": 0.2,
                    "response_mime_type": "application/json",
                },
            )
            response = model.generate_content(build_diagnosis_prompt(symptom))
            result = validate_diagnosis_result(parse_gemini_json(response.text))
        except json.JSONDecodeError:
            return Response(
                {"status": "error", "message": "Gemini returned invalid JSON."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError as error:
            return Response(
                {"status": "error", "message": str(error)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as error:
            return Response(
                {"status": "error", "message": f"Gemini diagnosis failed: {error}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"status": "success", "data": result},
            status=status.HTTP_200_OK,
        )
