import json
import math
import os

from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from django.contrib.auth import authenticate
import google.generativeai as genai
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ChatMessage, Diagnosis, User
from .serializers import (
    ChatMessageSerializer,
    ChatRequestSerializer,
    DiagnosisHistorySerializer,
    DiagnosisRequestSerializer,
    LoginSerializer,
    RegisterSerializer,
    AdminDiagnosisSerializer,
)


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


class ProviderError(Exception):
    pass


def first_serializer_error(serializer):
    return str(next(iter(serializer.errors.values()))[0])


def build_diagnosis_prompt(symptom, language="en"):
    # Language instruction injected based on the requested language
    lang_inst = ""
    if language == "ur":
        lang_inst = """
- Language Rule: You MUST write the text contents of the fields ("fault_name", "probable_causes", "recommended_actions", and "repair_steps") in the Urdu language (اردو) using standard Arabic/Persian script (Nasta'liq).
- Urdu Quality Rule: Do NOT repeat sentences or phrases. Keep the wording clear, varied, and natural. Make sure the "repair_steps" explain the mechanical procedure clearly in Urdu, step-by-step, without duplicating phrases across steps. The component_id must remain a lowercase English string identifier.
"""
    elif language == "ar":
        lang_inst = """
- Language Rule: You MUST write the text contents of the fields ("fault_name", "probable_causes", "recommended_actions", and "repair_steps") in the Arabic language (العربية) using standard Arabic script.
- Arabic Quality Rule: Keep the wording clear, varied, and natural, without repeating instructions or sentences. The component_id must remain a lowercase English string identifier.
"""
    elif language == "roman-ur":
        lang_inst = """
- Language Rule: You MUST write the text contents of the fields ("fault_name", "probable_causes", "recommended_actions", and "repair_steps") in Roman Urdu (Urdu language written in English/Latin letters, e.g., "Engine start nahi ho raha aur aawaz aa rahi hai", "Brakes ghis gaye hain", "Brake pads ko tabdeel karein").
- Roman Urdu Quality Rule: Keep the wording clear, varied, and natural, without repeating instructions. The component_id must remain a lowercase English string identifier.
"""
    else:
        lang_inst = """
- Language Rule: Write the text contents in standard English.
"""

    return f"""
You are the advanced diagnostic engine and master mechanic for V-DAS, a vehicle diagnostic and assistance system.
Analyze this vehicle symptom and return one likely diagnosis with a highly detailed repair guide.

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
- NO REPETITION RULE: Every item inside "probable_causes", "recommended_actions", and "repair_steps" must be completely unique, distinct, and provide different information. Do NOT repeat similar explanations or terms across items.
- repair_steps MUST be highly detailed, comprehensive, and explanatory step-by-step instructions. Write them so that a beginner can easily follow them to repair the car. Each step must be long, descriptive, and provide new actions, not duplicates of previous steps.
- Do not include markdown, code fences, comments, or extra text.{lang_inst}
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
    extra = set(data.keys()) - REQUIRED_DIAGNOSIS_FIELDS
    if extra:
        raise ValueError(f"Diagnosis result has unexpected fields: {', '.join(sorted(extra))}.")

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
        "confidence": data["confidence"],
        "probable_causes": [item.strip() for item in data["probable_causes"]],
        "recommended_actions": [item.strip() for item in data["recommended_actions"]],
        "repair_difficulty": data["repair_difficulty"],
        "repair_steps": [item.strip() for item in data["repair_steps"]],
    }


def call_groq(symptom, language="en"):
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ProviderError("GROQ_API_KEY is not configured.")

    payload = {
        "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        "temperature": 0.4,
        "messages": [
            {
                "role": "system",
                "content": "You are the diagnostic engine for V-DAS. Return only valid JSON.",
            },
            {
                "role": "user",
                "content": build_diagnosis_prompt(symptom, language),
            },
        ],
    }

    req = urllib_request.Request(
        url="https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "V-DAS/1.0",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=30) as response:
            raw_payload = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise ProviderError(f"Groq HTTP {error.code}: {body}")
    except urllib_error.URLError as error:
        raise ProviderError(f"Groq request failed: {error.reason}")
    except TimeoutError:
        raise ProviderError("Groq request timed out.")
    except Exception as error:
        raise ProviderError(f"Groq diagnosis failed: {error}")

    try:
        content = raw_payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise ProviderError("Groq returned an unexpected response shape.")

    try:
        return validate_diagnosis_result(parse_gemini_json(content))
    except (json.JSONDecodeError, ValueError) as error:
        raise ProviderError(f"Groq returned invalid diagnosis JSON: {error}")


def call_gemini(symptom, language="en"):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ProviderError("GEMINI_API_KEY is not configured.")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
            generation_config={
                "temperature": 0.4,
                "response_mime_type": "application/json",
            },
        )
        response = model.generate_content(
            build_diagnosis_prompt(symptom, language),
            request_options={"timeout": 30},
        )
        return validate_diagnosis_result(parse_gemini_json(response.text))
    except json.JSONDecodeError as error:
        raise ProviderError(f"Gemini returned invalid JSON: {error}")
    except ValueError as error:
        raise ProviderError(str(error))
    except Exception as error:
        raise ProviderError(f"Gemini diagnosis failed: {error}")


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
                        "is_staff": user.is_staff,
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
                        "is_staff": user.is_staff,
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

        symptom = serializer.validated_data["symptom"]
        language = serializer.validated_data.get("language", "en")
        provider_errors = []

        try:
            result = call_groq(symptom, language)
        except ProviderError as error:
            provider_errors.append(str(error))
            try:
                result = call_gemini(symptom, language)
            except ProviderError as fallback_error:
                provider_errors.append(str(fallback_error))
                result = None

        if result is None:
            return Response(
                {
                    "status": "error",
                    "message": "Diagnosis failed. " + " | ".join(provider_errors),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        diagnosis_id = None
        if request.user.is_authenticated:
            diagnosis = Diagnosis.objects.create(user=request.user, symptom=symptom, result=result)
            diagnosis_id = diagnosis.id

        response_data = {**result}
        if diagnosis_id is not None:
            response_data["diagnosis_id"] = diagnosis_id

        return Response(
            {"status": "success", "data": response_data},
            status=status.HTTP_200_OK,
        )


class HistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        diagnoses = Diagnosis.objects.filter(user=request.user)
        serializer = DiagnosisHistorySerializer(diagnoses, many=True)
        return Response(
            {"status": "success", "data": serializer.data},
            status=status.HTTP_200_OK,
        )


def build_chat_prompt(diagnosis_result, history, user_message, language="en"):
    """Build a prompt that includes diagnosis context and conversation history."""
    context_parts = [
        f"Fault: {diagnosis_result.get('fault_name', 'Unknown')}",
        f"Confidence: {diagnosis_result.get('confidence', 'N/A')}%",
        f"Component: {diagnosis_result.get('component_id', 'Unknown')}",
        f"Difficulty: {diagnosis_result.get('repair_difficulty', 'Unknown')}",
        f"Causes: {', '.join(diagnosis_result.get('probable_causes', []))}",
        f"Actions: {', '.join(diagnosis_result.get('recommended_actions', []))}",
    ]
    diagnosis_context = "\n".join(context_parts)

    conversation = ""
    for msg in history:
        role_label = "User" if msg.role == "user" else "Assistant"
        conversation += f"{role_label}: {msg.content}\n"

    # Injected language instruction for follow-up chat
    lang_inst = ""
    if language == "ur":
        lang_inst = "You MUST write your response in the Urdu language (اردو) using standard Arabic/Persian script."
    elif language == "ar":
        lang_inst = "You MUST write your response in the Arabic language (العربية) using standard Arabic script."
    elif language == "roman-ur":
        lang_inst = "You MUST write your response in Roman Urdu (Urdu written in the English/Latin alphabet, e.g. 'Aap brake pads change kar lein', 'Aap ko mechanic ke paas jana chahiye')."
    else:
        lang_inst = "Write your response in standard English."

    return f"""
You are V-DAS, an expert AI vehicle diagnostic assistant. You previously diagnosed a vehicle issue.
Here is the diagnosis context:

{diagnosis_context}

{f"Previous conversation:\n{conversation}" if conversation else ""}

The user now asks a follow-up question. Provide a helpful, accurate, and concise answer.
Keep your response focused and practical. Do not repeat the entire diagnosis unless asked.
If the user asks about costs, give reasonable estimates. If about safety, be cautious and responsible.

Language instruction: {lang_inst}

User question: {user_message}
""".strip()


def call_groq_chat(prompt):
    """Send a chat prompt to Groq and return the text reply."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ProviderError("GROQ_API_KEY is not configured.")

    payload = {
        "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
        "temperature": 0.4,
        "max_tokens": 1024,
        "messages": [
            {
                "role": "system",
                "content": "You are V-DAS, a helpful vehicle diagnostic assistant. Give concise, practical answers.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    }

    req = urllib_request.Request(
        url="https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "V-DAS/1.0",
        },
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=30) as response:
            raw_payload = json.loads(response.read().decode("utf-8"))
    except urllib_error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise ProviderError(f"Groq HTTP {error.code}: {body}")
    except urllib_error.URLError as error:
        raise ProviderError(f"Groq request failed: {error.reason}")
    except TimeoutError:
        raise ProviderError("Groq request timed out.")
    except Exception as error:
        raise ProviderError(f"Groq chat failed: {error}")

    try:
        return raw_payload["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError):
        raise ProviderError("Groq returned an unexpected response shape.")


def call_gemini_chat(prompt):
    """Send a chat prompt to Gemini and return the text reply."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ProviderError("GEMINI_API_KEY is not configured.")

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
            generation_config={"temperature": 0.4, "max_output_tokens": 1024},
        )
        response = model.generate_content(
            prompt,
            request_options={"timeout": 30},
        )
        return response.text.strip()
    except Exception as error:
        raise ProviderError(f"Gemini chat failed: {error}")


class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "message": first_serializer_error(serializer)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        diagnosis_id = serializer.validated_data["diagnosis_id"]
        user_message = serializer.validated_data["message"]
        language = serializer.validated_data.get("language", "en")

        try:
            diagnosis = Diagnosis.objects.get(id=diagnosis_id, user=request.user)
        except Diagnosis.DoesNotExist:
            return Response(
                {"status": "error", "message": "Diagnosis not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Load conversation history (limit to last 20 messages for context window)
        history = list(diagnosis.messages.all()[:20])

        # Build the prompt with diagnosis context + conversation history
        prompt = build_chat_prompt(diagnosis.result, history, user_message, language)

        # Try Groq first, fall back to Gemini
        provider_errors = []
        reply = None

        try:
            reply = call_groq_chat(prompt)
        except ProviderError as error:
            provider_errors.append(str(error))
            try:
                reply = call_gemini_chat(prompt)
            except ProviderError as fallback_error:
                provider_errors.append(str(fallback_error))

        if reply is None:
            return Response(
                {
                    "status": "error",
                    "message": "Chat failed. " + " | ".join(provider_errors),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Save both messages to the database
        ChatMessage.objects.create(
            diagnosis=diagnosis, role="user", content=user_message
        )
        ChatMessage.objects.create(
            diagnosis=diagnosis, role="assistant", content=reply
        )

        return Response(
            {"status": "success", "data": {"reply": reply}},
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        """Get chat history for a specific diagnosis."""
        diagnosis_id = request.query_params.get("diagnosis_id")
        if not diagnosis_id:
            return Response(
                {"status": "error", "message": "diagnosis_id parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            diagnosis = Diagnosis.objects.get(id=diagnosis_id, user=request.user)
        except Diagnosis.DoesNotExist:
            return Response(
                {"status": "error", "message": "Diagnosis not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = diagnosis.messages.all()
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(
            {"status": "success", "data": serializer.data},
            status=status.HTTP_200_OK,
        )


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


VEHICLE_SERVICE_TAGS = {
    "service:vehicle:brakes": "Brakes",
    "service:vehicle:engine": "Engine",
    "service:vehicle:transmission": "Transmission",
    "service:vehicle:suspension": "Suspension",
    "service:vehicle:exhaust": "Exhaust",
    "service:vehicle:tyres": "Tyres",
    "service:vehicle:air_conditioning": "AC",
    "service:vehicle:electrical": "Electrical",
    "service:vehicle:oil_change": "Oil Change",
    "service:vehicle:body_repair": "Body Repair",
}


class MechanicsLocatorView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        lat_str = request.query_params.get("lat")
        lng_str = request.query_params.get("lng")

        if not lat_str or not lng_str:
            return Response(
                {"status": "error", "message": "lat and lng parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except ValueError:
            return Response(
                {"status": "error", "message": "lat and lng must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        overpass_query = f"""
[out:json][timeout:10];
(
  node["shop"="car_repair"](around:30000,{lat},{lng});
  way["shop"="car_repair"](around:30000,{lat},{lng});
  node["craft"="car_repair"](around:30000,{lat},{lng});
  way["craft"="car_repair"](around:30000,{lat},{lng});
  node["amenity"="car_repair"](around:30000,{lat},{lng});
  way["amenity"="car_repair"](around:30000,{lat},{lng});
);
out body center;
""".strip()
            
        req = urllib_request.Request(
            url="https://overpass-api.de/api/interpreter",
            data=urllib_parse.urlencode({"data": overpass_query}).encode("utf-8"),
            headers={
                "User-Agent": "V-DAS/1.0 (Mechanics Locator)",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        
        try:
            with urllib_request.urlopen(req, timeout=15) as response:
                osm_data = json.loads(response.read().decode("utf-8"))
        except Exception as e:
            return Response(
                {"status": "error", "message": f"Failed to fetch mechanics: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        elements = osm_data.get("elements", [])
        mechanics = []

        for element in elements:
            tags = element.get("tags", {})
            name = tags.get("name")
            if not name:
                continue

            if element.get("type") == "way":
                center = element.get("center", {})
                place_lat = center.get("lat", 0)
                place_lon = center.get("lon", 0)
            else:
                place_lat = element.get("lat", 0)
                place_lon = element.get("lon", 0)

            dist = haversine_distance(lat, lng, place_lat, place_lon)

            phone = (
                tags.get("phone")
                or tags.get("contact:phone")
                or "Not available"
            )

            specialties = [
                label
                for tag_key, label in VEHICLE_SERVICE_TAGS.items()
                if tags.get(tag_key) == "yes"
            ]
            if not specialties:
                specialties = ["General Repair"]

            addr_parts = []
            for key in ("addr:street", "addr:city", "addr:state"):
                val = tags.get(key)
                if val:
                    addr_parts.append(val)
            address = ", ".join(addr_parts) if addr_parts else name

            mechanics.append({
                "id": str(element.get("id", "")),
                "name": name,
                "address": address,
                "lat": place_lat,
                "lng": place_lon,
                "phone": phone,
                "distance_km": round(dist, 1),
                "specialties": specialties,
            })
            
        mechanics.sort(key=lambda x: x["distance_km"])
        
        return Response(
            {"status": "success", "data": mechanics[:5]},
            status=status.HTTP_200_OK
        )


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response(
                {"status": "error", "message": "Only staff members can access admin stats."},
                status=status.HTTP_403_FORBIDDEN
            )

        total_users = User.objects.count()
        total_diagnoses = Diagnosis.objects.count()
        total_earnings = total_diagnoses * 1000  # Simulated as 1000 PKR per diagnosis

        recent_qs = Diagnosis.objects.select_related("user").order_by("-created_at")[:15]
        recent_data = AdminDiagnosisSerializer(recent_qs, many=True).data

        return Response(
            {
                "status": "success",
                "data": {
                    "total_users": total_users,
                    "total_diagnoses": total_diagnoses,
                    "total_earnings": total_earnings,
                    "recent_diagnoses": recent_data,
                }
            },
            status=status.HTTP_200_OK
        )

