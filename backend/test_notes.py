import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.fixture
def auth_token(user_data):
    client.post("/auth/register", json=user_data)
    response = client.post("/auth/login", json={"email": user_data["email"], "password": user_data["password"]})
    return response.json()["access_token"]

@pytest.fixture
def user_data():
    return {"username": "noteuser", "email": "noteuser@example.com", "password": "notepass123"}

def test_note_crud(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    # Create note
    note_data = {"title": "Test Note", "content": "This is a test note."}
    response = client.post("/notes", json=note_data, headers=headers)
    assert response.status_code == 200 or response.status_code == 201
    note = response.json()
    note_id = note["id"]
    # Get note
    response = client.get(f"/notes/{note_id}", headers=headers)
    assert response.status_code == 200
    # Update note
    update_data = {"title": "Updated Note", "content": "Updated content."}
    response = client.put(f"/notes/{note_id}", json=update_data, headers=headers)
    assert response.status_code == 200
    # Delete note
    response = client.delete(f"/notes/{note_id}", headers=headers)
    assert response.status_code == 200

def test_create_note_missing_title(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    note_data = {"content": "No title"}
    response = client.post("/notes", json=note_data, headers=headers)
    assert response.status_code == 422 or response.status_code == 400

def test_update_note_invalid_id(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {"title": "Updated", "content": "Updated content."}
    response = client.put("/notes/invalid-id", json=update_data, headers=headers)
    assert response.status_code == 404 or response.status_code == 422

def test_delete_note_invalid_id(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.delete("/notes/invalid-id", headers=headers)
    assert response.status_code == 404 or response.status_code == 422

def test_get_notes_list(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = client.get("/notes", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list) 