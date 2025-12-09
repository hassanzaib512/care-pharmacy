import 'package:google_sign_in/google_sign_in.dart';

/// Helper for Google Sign-In using google_sign_in v7+ API.
/// Client ID is supplied via --dart-define=GOOGLE_CLIENT_ID at build time
/// so no secrets are hard-coded in the app.
class GoogleAuthHelper {
  static const String _clientId =
      String.fromEnvironment('GOOGLE_CLIENT_ID', defaultValue: '');
  static final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  static bool _initialized = false;

  /// Ensures the GoogleSignIn instance is initialized with desired params.
  static Future<void> _ensureInitialized() async {
    if (_initialized) return;
    await _googleSignIn.initialize(
      clientId: _clientId.isNotEmpty ? _clientId : null,
    );
    _initialized = true;
  }

  /// Performs sign-in and returns an ID token, or null on cancel/failure.
  static Future<String?> signInAndGetIdToken() async {
    try {
      await _ensureInitialized();

      // Try lightweight auth first; if it returns null, fall back to full auth.
      Future<GoogleSignInAccount?>? lightweight =
          _googleSignIn.attemptLightweightAuthentication();

      GoogleSignInAccount? account =
          lightweight != null ? await lightweight : null;
      account ??= await _googleSignIn.authenticate();

      final auth = account.authentication;
      return auth.idToken;
    } catch (_) {
      return null;
    }
  }

  /// Signs out the current user.
  static Future<void> signOut() async {
    await _ensureInitialized();
    await _googleSignIn.signOut();
  }
}
