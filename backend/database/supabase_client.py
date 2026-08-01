from supabase import create_client, Client
from backend.config import settings

def get_supabase_client() -> Client:
    """Returns standard client initialized with anon key for user-context ops."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_supabase_admin_client() -> Client:
    """Returns admin client initialized with service role key for system ops."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
