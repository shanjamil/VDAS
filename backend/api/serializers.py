from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


User = get_user_model()
from .models import Diagnosis


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "name")

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class DiagnosisRequestSerializer(serializers.Serializer):
    symptom = serializers.CharField(min_length=5, max_length=1000, trim_whitespace=True)


class DiagnosisHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = ("id", "symptom", "result", "created_at")
