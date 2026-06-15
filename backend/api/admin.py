from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Diagnosis, ChatMessage


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("id",)
    list_display = ("email", "name", "is_staff", "is_active")
    search_fields = ("email", "name")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("name",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "password1", "password2", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "symptom", "get_fault_name", "created_at")
    search_fields = ("symptom", "user__email", "user__name")
    list_filter = ("created_at",)

    def get_fault_name(self, obj):
        return obj.result.get("fault_name", "Unknown") if isinstance(obj.result, dict) else "N/A"
    get_fault_name.short_description = "Fault Diagnosed"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "diagnosis", "role", "content_preview", "created_at")
    search_fields = ("content", "diagnosis__id", "diagnosis__user__email")
    list_filter = ("role", "created_at")

    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = "Message Preview"
