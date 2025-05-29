import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.fixture
def user_data():
    return {"username": "testuser", "email": "testuser@example.com", "password": "testpass123"}

def test_register_and_login(user_data):
    # Register
    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 200 or response.status_code == 201
    # Login
    response = client.post("/auth/login", json={"email": user_data["email"], "password": user_data["password"]})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    token = data["access_token"]
    # Access protected endpoint
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/notes", headers=headers)
    assert response.status_code == 200 or response.status_code == 404  # 404 if no notes yet 

def test_register_existing_email(user_data):
    client.post("/auth/register", json=user_data)
    response = client.post("/auth/register", json=user_data)
    assert response.status_code == 400 or response.status_code == 409

def test_login_wrong_password(user_data):
    client.post("/auth/register", json=user_data)
    response = client.post("/auth/login", json={"email": user_data["email"], "password": "wrongpass"})
    assert response.status_code == 401

def test_protected_endpoint_no_token():
    response = client.get("/notes")
    assert response.status_code == 401 