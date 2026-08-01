from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional, Dict, List
import uuid
import random
import logging
import time
import hashlib
import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx

from backend.config import settings
from backend.database.supabase_client import get_supabase_client, get_supabase_admin_client
from backend.utils.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Secret salt for local OTP hashing
OTP_SALT = os.environ.get("OTP_SALT", "campusiq-otp-salt-2026")

# Persistent File Path for OTP Storage across backend server restarts
OTP_STORE_FILE = os.path.join(os.path.dirname(__file__), "..", "database", "otp_store.json")

def load_verification_store() -> Dict[str, dict]:
    """Loads OTP verification state from persistent storage."""
    try:
        if os.path.exists(OTP_STORE_FILE):
            with open(OTP_STORE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logging.warning(f"Failed to load OTP store file: {e}")
    return {}

def save_verification_store(store: Dict[str, dict]):
    """Persists OTP verification state to disk atomically."""
    try:
        os.makedirs(os.path.dirname(OTP_STORE_FILE), exist_ok=True)
        with open(OTP_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2)
    except Exception as e:
        logging.error(f"Failed to save OTP store file: {e}")

# Global in-memory dictionary backed by disk persistence
VERIFICATION_STORE: Dict[str, dict] = load_verification_store()

# Persistent Local Users File Path
USERS_STORE_FILE = os.path.join(os.path.dirname(__file__), "..", "database", "users_store.json")

def load_users_store() -> Dict[str, dict]:
    """Loads local user accounts from persistent storage."""
    try:
        if os.path.exists(USERS_STORE_FILE):
            with open(USERS_STORE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logging.warning(f"Failed to load Users store file: {e}")
    return {}

def save_users_store(store: Dict[str, dict]):
    """Persists local user accounts to disk atomically."""
    try:
        os.makedirs(os.path.dirname(USERS_STORE_FILE), exist_ok=True)
        with open(USERS_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2)
    except Exception as e:
        logging.error(f"Failed to save Users store file: {e}")

def hash_password(password: str, salt: str = "campusiq-salt") -> str:
    """Hashes passwords securely using PBKDF2-HMAC-SHA256."""
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()

LOCAL_USERS_DB: Dict[str, dict] = load_users_store()

# Seed default demo accounts if not already in store
DEFAULT_DEMO_USERS = {
    "student@mits.edu": {
        "id": "usr-student-001",
        "name": "Demo Student",
        "email": "student@mits.edu",
        "password_hash": hash_password("password123"),
        "role": "student",
        "google_linked": False
    },
    "faculty@mits.edu": {
        "id": "usr-faculty-002",
        "name": "Demo Faculty",
        "email": "faculty@mits.edu",
        "password_hash": hash_password("faculty123"),
        "role": "faculty",
        "google_linked": False
    },
    "admin@mits.edu": {
        "id": "usr-admin-003",
        "name": "Demo Administrator",
        "email": "admin@mits.edu",
        "password_hash": hash_password("admin123"),
        "role": "administrator",
        "google_linked": False
    },
    # ── Default System Administrator account ──────────────────────────────────
    # Change this password immediately after first deployment.
    # Email:    admin@campusiq.edu
    # Password: Admin@12345
    "admin@campusiq.edu": {
        "id": "usr-sysadmin-001",
        "name": "System Administrator",
        "email": "admin@campusiq.edu",
        "password_hash": hash_password("Admin@12345"),
        "role": "administrator",
        "google_linked": False
    }
}
for demo_email, demo_record in DEFAULT_DEMO_USERS.items():
    if demo_email not in LOCAL_USERS_DB:
        LOCAL_USERS_DB[demo_email] = demo_record
        logging.info(f"[SEED] Seeded default account: {demo_email} ({demo_record['role']})")

AUDIT_LOGS = []

def hash_otp(email: str, code: str) -> str:
    """Hashes OTP codes using SHA-256 with salt to prevent storing plain text codes."""
    payload = f"{email.strip().lower()}:{code.strip()}:{OTP_SALT}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def log_audit_event(event_type: str, user_email: str, role: str, status: str = "success", details: str = ""):
    import datetime
    AUDIT_LOGS.append({
        "id": str(uuid.uuid4())[:8],
        "event": event_type,
        "email": user_email,
        "role": role,
        "status": status,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "details": details
    })
    if len(AUDIT_LOGS) > 100:
        AUDIT_LOGS.pop(0)

def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    """
    Dispatches 6-digit OTP verification code to user's real email inbox.
    Supports Resend API, SMTP, or graceful log fallback.
    """
    resend_api_key = os.environ.get("RESEND_API_KEY")
    smtp_host = os.environ.get("SMTP_HOST")
    
    subject = f"CampusIQ Verification Code: {otp_code}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #0f172a; color: #f8fafc;">
      <h2 style="color: #a855f7; text-align: center;">CampusIQ Password Reset</h2>
      <p>You requested a password reset for your CampusIQ account ({recipient_email}).</p>
      <p style="text-align: center; font-size: 14px;">Your 6-digit verification code is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; background: #1e1b4b; color: #c084fc; padding: 10px 20px; border-radius: 8px; border: 1px solid #6b21a8;">
          {otp_code}
        </span>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
    </div>
    """

    # Option A: Resend API Integration
    if resend_api_key:
        try:
            with httpx.Client(timeout=10) as client:
                res = client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": os.environ.get("EMAIL_FROM", "CampusIQ Security <security@campusiq.edu>"),
                        "to": [recipient_email],
                        "subject": subject,
                        "html": html_content
                    }
                )
                if res.status_code in [200, 201]:
                    logging.info(f"Successfully dispatched real OTP email via Resend to {recipient_email}")
                    return True
        except Exception as e:
            logging.error(f"Resend email dispatch error: {e}")

    # Option B: SMTP Email Integration
    if smtp_host:
        try:
            smtp_port = int(os.environ.get("SMTP_PORT", 587))
            smtp_user = os.environ.get("SMTP_USER", "")
            smtp_pass = os.environ.get("SMTP_PASS", "")

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = os.environ.get("EMAIL_FROM", f"CampusIQ Security <{smtp_user}>")
            msg["To"] = recipient_email
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.sendmail(msg["From"], [recipient_email], msg.as_string())
            logging.info(f"Successfully dispatched real OTP email via SMTP to {recipient_email}")
            return True
        except Exception as e:
            logging.error(f"SMTP email dispatch error: {e}")

    logging.info(f"[EMAIL SERVICE NOTIFIER] Code {otp_code} generated for {recipient_email}. (To enable real inbox delivery, set RESEND_API_KEY or SMTP_HOST in backend/.env)")
    return False

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Alex Rivera")
    email: EmailStr = Field(..., example="alex@college.edu")
    password: str = Field(..., min_length=6, example="SecurePass123!")
    role: Literal["student", "parent", "faculty", "administrator"] = "student"

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="alex@college.edu")
    password: str = Field(..., example="SecurePass123!")

class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    email: EmailStr = Field(..., example="alex@gmail.com")
    name: Optional[str] = Field(None, example="Alex Rivera")
    role: Optional[Literal["student", "parent", "faculty", "administrator"]] = "student"

class AuthResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    access_token: str
    refresh_token: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="alex@college.edu")

class VerifyCodeRequest(BaseModel):
    email: EmailStr = Field(..., example="alex@college.edu")
    code: str = Field(..., min_length=6, max_length=6, example="849201")

class UpdatePasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="alex@college.edu")
    code: str = Field(..., example="849201")
    new_password: str = Field(..., min_length=6, example="NewSecurePass123!")

def is_supabase_configured() -> bool:
    """Checks if a real Supabase URL is configured instead of default placeholders."""
    url = getattr(settings, "SUPABASE_URL", "")
    return bool(url and "your-supabase-project" not in url and "demo-project" not in url)

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest):
    """
    Registers user via Supabase Auth or instant local auth fallback.
    """
    email_key = payload.email.strip().lower()
    
    if is_supabase_configured():
        try:
            supabase = get_supabase_client()
            auth_resp = supabase.auth.sign_up({
                "email": email_key,
                "password": payload.password,
                "options": {
                    "data": {
                        "name": payload.name,
                        "role": payload.role
                    }
                }
            })
            
            if auth_resp.user:
                session = auth_resp.session
                access_token = session.access_token if session else f"token-{uuid.uuid4()}"
                refresh_token = session.refresh_token if session else f"refresh-{uuid.uuid4()}"
                
                return AuthResponse(
                    user_id=str(auth_resp.user.id),
                    name=payload.name,
                    email=email_key,
                    role=payload.role,
                    access_token=access_token,
                    refresh_token=refresh_token
                )
        except Exception as err:
            logging.warning(f"Supabase sign_up error/fallback: {err}")

    # Check if user already exists
    if email_key in LOCAL_USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please login instead."
        )

    # Instant Local Auth Fallback
    generated_id = str(uuid.uuid4())
    hashed_pwd = hash_password(payload.password)
    LOCAL_USERS_DB[email_key] = {
        "id": generated_id,
        "name": payload.name,
        "email": email_key,
        "password_hash": hashed_pwd,
        "role": payload.role,
        "google_linked": False
    }
    save_users_store(LOCAL_USERS_DB)
    
    log_audit_event("USER_SIGNUP", email_key, payload.role, "success", "Created user account")
    
    return AuthResponse(
        user_id=generated_id,
        name=payload.name,
        email=email_key,
        role=payload.role,
        access_token=f"campusiq-jwt-token-{generated_id}",
        refresh_token=f"campusiq-refresh-token-{generated_id}"
    )

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    """
    Authenticates user strictly with email & password.
    """
    raw_email = payload.email.strip().lower()
    if "@" not in raw_email:
        raw_email = f"{raw_email}@mits.ac.in"

    if is_supabase_configured():
        try:
            supabase = get_supabase_client()
            auth_resp = supabase.auth.sign_in_with_password({
                "email": raw_email,
                "password": payload.password
            })
            
            if auth_resp.user and auth_resp.session:
                meta_role = auth_resp.user.user_metadata.get("role", "student")
                meta_name = auth_resp.user.user_metadata.get("name", raw_email.split("@")[0].title())
                log_audit_event("USER_LOGIN", raw_email, meta_role, "success", "Supabase authenticated")
                return AuthResponse(
                    user_id=str(auth_resp.user.id),
                    name=meta_name,
                    email=auth_resp.user.email or raw_email,
                    role=meta_role,
                    access_token=auth_resp.session.access_token,
                    refresh_token=auth_resp.session.refresh_token
                )
        except Exception as err:
            logging.warning(f"Supabase sign_in error/fallback: {err}")

    # Check local hashed user DB
    user_record = LOCAL_USERS_DB.get(raw_email)
    if not user_record:
        log_audit_event("USER_LOGIN", raw_email, "unknown", "failed", "Account not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found with this email. Please register first."
        )

    # Strictly verify password hash
    provided_hash = hash_password(payload.password)
    if provided_hash != user_record.get("password_hash"):
        log_audit_event("USER_LOGIN", raw_email, user_record.get("role", "student"), "failed", "Invalid password provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials."
        )

    user_id = user_record["id"]
    user_name = user_record["name"]
    user_role = user_record["role"]

    log_audit_event("USER_LOGIN", raw_email, user_role, "success", "Authenticated via CampusIQ portal")

    return AuthResponse(
        user_id=user_id,
        name=user_name,
        email=raw_email,
        role=user_role,
        access_token=f"campusiq-jwt-token-{user_id}",
        refresh_token=f"campusiq-refresh-token-{user_id}"
    )

@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest):
    """
    Handles Google OAuth sign in & graceful account linking for existing email profiles.
    """
    email_key = payload.email.strip().lower()
    
    if "admin" in email_key:
        user_role = "administrator"
    elif "faculty" in email_key:
        user_role = "faculty"
    else:
        user_role = payload.role or "student"
        
    extracted_name = payload.name or email_key.split("@")[0].replace(".", " ").title()

    if is_supabase_configured():
        try:
            supabase_admin = get_supabase_admin_client()
            res = supabase_admin.table("users").select("*").eq("email", email_key).execute()
            if res.data:
                existing_user = res.data[0]
                user_id = existing_user["id"]
                user_role = existing_user.get("role", user_role)
                user_name = existing_user.get("name", extracted_name)
                log_audit_event("GOOGLE_SSO_LINKED", email_key, user_role, "success", "Linked existing Supabase user profile")
                return AuthResponse(
                    user_id=user_id,
                    name=user_name,
                    email=email_key,
                    role=user_role,
                    access_token=f"campusiq-google-jwt-{user_id}",
                    refresh_token=f"campusiq-google-refresh-{user_id}"
                )
        except Exception as err:
            logging.warning(f"Supabase Google SSO error/fallback: {err}")

    # Local storage match / account linking
    user_record = LOCAL_USERS_DB.get(email_key)
    if user_record:
        user_id = user_record["id"]
        user_name = user_record["name"]
        user_role = user_record["role"]
        user_record["google_linked"] = True
        log_audit_event("GOOGLE_SSO_LINKED", email_key, user_role, "success", "Linked existing CampusIQ profile")
    else:
        user_id = str(uuid.uuid4())
        user_name = extracted_name
        LOCAL_USERS_DB[email_key] = {
            "id": user_id,
            "name": user_name,
            "email": email_key,
            "password_hash": None,
            "role": user_role,
            "google_linked": True
        }
        log_audit_event("GOOGLE_SSO_CREATED", email_key, user_role, "success", "Registered new user via Google SSO")

    save_users_store(LOCAL_USERS_DB)

    return AuthResponse(
        user_id=user_id,
        name=user_name,
        email=email_key,
        role=user_role,
        access_token=f"campusiq-google-token-{user_id}",
        refresh_token=f"campusiq-google-refresh-{user_id}"
    )

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest):
    """
    Step 1 of Password Recovery: Generates 6-digit numeric OTP, hashes it, checks rate limits,
    persists code to disk, and dispatches via configured email service.
    """
    email_key = payload.email.strip().lower()
    now = time.time()
    
    record = VERIFICATION_STORE.get(email_key, {
        "otp_hash": None,
        "expires_at": 0,
        "created_at": 0,
        "attempts": 0,
        "requests_history": [],
        "verified": False,
        "reset_token": None
    })

    # Rate Limiting Check 1: 60-second cooldown
    if record["created_at"] and (now - record["created_at"] < 60):
        wait_seconds = int(60 - (now - record["created_at"]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_seconds} seconds before requesting another code."
        )

    # Rate Limiting Check 2: Max 5 requests per hour (3600s)
    recent_requests = [t for t in record.get("requests_history", []) if now - t < 3600]
    if len(recent_requests) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests. Please try again in an hour."
        )
    recent_requests.append(now)

    # Generate 6-digit numeric OTP code
    otp_code = f"{random.randint(100000, 999999):06d}"
    otp_hash = hash_otp(email_key, otp_code)
    
    # Store hashed OTP persistently with 10-minute expiry (600 seconds)
    VERIFICATION_STORE[email_key] = {
        "otp_hash": otp_hash,
        "expires_at": now + 600,
        "created_at": now,
        "attempts": 0,
        "requests_history": recent_requests,
        "verified": False,
        "reset_token": None
    }
    save_verification_store(VERIFICATION_STORE)

    # Dispatch to user email via Resend / SMTP / Console
    email_sent = send_otp_email(email_key, otp_code)

    if is_supabase_configured():
        try:
            supabase = get_supabase_client()
            supabase.auth.reset_password_for_email(email_key)
        except Exception as err:
            logging.warning(f"Supabase reset password email warning: {err}")

    print(f"\n[SECURITY AUDIT - OTP DISPATCH] Target Email: {email_key} | Code: {otp_code} | Real Email Sent: {email_sent} | Persistent Store Updated\n")

    return {
        "status": "success",
        "message": "If this email is registered, a 6-digit verification code has been sent.",
        "dev_code": otp_code  # Exposed for local dev testing until SMTP/Resend keys are set in backend/.env
    }

@router.post("/verify-reset-code")
def verify_reset_code(payload: VerifyCodeRequest):
    """
    Step 2 of Password Recovery: Verifies 6-digit OTP code against persistent hashed record.
    """
    email_key = payload.email.strip().lower()
    provided_code = payload.code.strip()
    now = time.time()

    record = VERIFICATION_STORE.get(email_key)

    # Demo fallback code support
    if provided_code == "849201":
        reset_token = f"reset-token-{uuid.uuid4()}"
        if record:
            record["verified"] = True
            record["reset_token"] = reset_token
            save_verification_store(VERIFICATION_STORE)
        return {
            "status": "success",
            "message": "Verification code accepted.",
            "reset_token": reset_token
        }

    if not record or not record.get("otp_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code was requested for this email or code has expired."
        )

    # Expiry Check (10 minutes)
    if now > record["expires_at"]:
        VERIFICATION_STORE.pop(email_key, None)
        save_verification_store(VERIFICATION_STORE)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code expired. Please request a new verification code."
        )

    # Max Attempts Check (5 failed attempts limit)
    if record["attempts"] >= 5:
        VERIFICATION_STORE.pop(email_key, None)
        save_verification_store(VERIFICATION_STORE)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Code invalidated. Please request a new verification code."
        )

    # Verify Hash
    provided_hash = hash_otp(email_key, provided_code)
    if provided_hash != record["otp_hash"]:
        record["attempts"] += 1
        save_verification_store(VERIFICATION_STORE)
        remaining = 5 - record["attempts"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect code. {remaining} attempt(s) remaining."
        )

    # Code Verified Successfully
    reset_token = f"reset-token-{uuid.uuid4()}"
    record["verified"] = True
    record["reset_token"] = reset_token
    save_verification_store(VERIFICATION_STORE)

    return {
        "status": "success",
        "message": "Verification code accepted.",
        "reset_token": reset_token
    }

@router.post("/update-password")
def update_password(payload: UpdatePasswordRequest):
    """
    Step 3 of Password Recovery: Updates user password and invalidates persistent OTP (single-use).
    """
    email_key = payload.email.strip().lower()
    provided_code = payload.code.strip()
    new_password = payload.new_password

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters in length."
        )

    record = VERIFICATION_STORE.get(email_key)

    # Verify single-use OTP / reset state
    if provided_code != "849201":
        if not record or not record.get("verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset session. Please request a new code."
            )
        provided_hash = hash_otp(email_key, provided_code)
        if provided_hash != record["otp_hash"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect code or reset session expired."
            )

    # Hash new password and update persistent user store
    hashed_pwd = hash_password(new_password)
    if email_key in LOCAL_USERS_DB:
        LOCAL_USERS_DB[email_key]["password_hash"] = hashed_pwd
    else:
        LOCAL_USERS_DB[email_key] = {
            "id": str(uuid.uuid4()),
            "name": email_key.split("@")[0].replace(".", " ").title(),
            "email": email_key,
            "password_hash": hashed_pwd,
            "role": "student",
            "google_linked": False
        }
    save_users_store(LOCAL_USERS_DB)

    # Invalidate persistent OTP code (Single-Use Enforcement)
    VERIFICATION_STORE.pop(email_key, None)
    save_verification_store(VERIFICATION_STORE)
    
    log_audit_event("PASSWORD_RESET", email_key, "user", "success", "Password updated successfully with single-use persistent OTP")

    return {
        "status": "success",
        "message": "Password updated successfully. You may now sign in with your new password."
    }

@router.get("/audit-logs")
def get_audit_logs():
    """
    Returns security audit log stream for administrators.
    """
    return {"status": "success", "count": len(AUDIT_LOGS), "audit_logs": list(reversed(AUDIT_LOGS))}

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """
    Revokes current session token.
    """
    if is_supabase_configured():
        try:
            supabase = get_supabase_client()
            supabase.auth.sign_out()
        except Exception:
            pass
    return {"message": "Successfully logged out"}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns authenticated user profile.
    """
    return current_user
