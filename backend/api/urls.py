from django.urls import path

from .views import DiagnoseView, HealthCheckView, LoginView, RegisterView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("diagnose/", DiagnoseView.as_view(), name="diagnose"),
]
