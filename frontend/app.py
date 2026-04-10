from flask import Flask, render_template, session, redirect, jsonify, request 
from flask_cors import CORS
import os
import json
import logging
import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from translation import get_all_translations
from dotenv import load_dotenv
import os
load_dotenv()

# Import modules
import auth
import budget_tracker

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.url_map.strict_slashes = False  # ADD THIS LINE

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

# Initialize Firebase Admin SDK
try:
    if os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY'):
        service_account_info = json.loads(os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY'))
        with open('/tmp/serviceAccountKey.json', 'w') as f:
            json.dump(service_account_info, f)
        cred = credentials.Certificate('/tmp/serviceAccountKey.json')
        logging.info("Firebase initialized from environment variable")
    elif os.path.exists("serviceAccountKey.json"):
        cred = credentials.Certificate("serviceAccountKey.json")
        logging.info("Firebase initialized from serviceAccountKey.json file")
    else:
        cred = credentials.ApplicationDefault()
        logging.info("Firebase initialized with Application Default Credentials")
    
    firebase_admin.initialize_app(cred)
    logging.info("Firebase initialized successfully")
except Exception as e:
    logging.error(f"Firebase initialization error: {e}")
    logging.error("Make sure serviceAccountKey.json exists in the project root")
    raise e

db = firestore.client()

# Initialize CORS
CORS(app, 
     supports_credentials=True,
     origins=['http://localhost:5000', 'http://127.0.0.1:5000'],
     allow_headers=['Content-Type'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
)

# Initialize modules
auth.init_auth(db)
budget_tracker.init_budget_tracker(db, auth)

# Register blueprints
app.register_blueprint(auth.auth_bp)
app.register_blueprint(budget_tracker.budget_bp)

# Main Routes
@app.route('/login', methods=['GET'])
def login_page():
    """Serve login/register page"""
    # Always show login page, don't check session here
    # Let the frontend JavaScript handle authentication
    return render_template('login.html')

@app.route('/', methods=['GET'])
def index():
    """Redirect root to login page"""
    return redirect('/login')

@app.route('/app', methods=['GET'])
def main_app():
    """Main application page for authenticated users"""
    # Server-side check - if no session, redirect to login
    if 'user_id' not in session or not session.get('user_id'):
        logging.debug(f"No user_id in session. Session: {dict(session)}")
        return redirect('/login')
    
    # Verify user still exists in database
    try:
        user_id = session.get('user_id')
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            logging.debug(f"User {user_id} not found in database")
            session.clear()
            return redirect('/login')
    except Exception as e:
        logging.error(f"Error verifying user: {e}")
        session.clear()
        return redirect('/login')
    
    logging.debug(f"User {user_id} authenticated, serving main app")
    return render_template('index.html')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Test Firestore connection
        db.collection('users').limit(1).get()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'modules': {
                'auth': 'loaded',
                'budget_tracker': 'loaded'
            }
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'disconnected',
            'error': str(e)
        }), 503
    

@app.route('/api/translations/<lang>', methods=['GET'])
def get_translations(lang):
    """Get translations for specified language"""
    if lang not in ['en', 'ta']:
        lang = 'en'
    return jsonify(get_all_translations(lang))

@app.route('/settings', methods=['GET'])
def settings_page():
    """Settings page for authenticated users"""
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('settings.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)