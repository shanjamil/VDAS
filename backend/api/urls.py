from django.urls import path

from .views import (
    ChatView,
    DiagnoseView,
    HealthCheckView,
    HistoryView,
    LoginView,
    MechanicsLocatorView,
    RegisterView,
    AdminStatsView,
)

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("diagnose/", DiagnoseView.as_view(), name="diagnose"),
    path("history/", HistoryView.as_view(), name="history"),
    path("chat/", ChatView.as_view(), name="chat"),
    path("mechanics/", MechanicsLocatorView.as_view(), name="mechanics"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin_stats"),
]
