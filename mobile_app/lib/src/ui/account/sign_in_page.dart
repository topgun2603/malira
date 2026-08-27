import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/repositories/auth_repository.dart';
import '../../state/auth.dart';
import '../../state/preferences.dart';
import '../common/app_logo.dart';

/// Sign in, or register.
///
/// One screen with a toggle rather than two, because the difference is a single
/// extra field. Somebody who taps "Sign in" and turns out not to have an
/// account should not have to go back and find a different door.
class SignInPage extends ConsumerStatefulWidget {
  const SignInPage({super.key});

  @override
  ConsumerState<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends ConsumerState<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool _registering = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final repository = ref.read(authRepositoryProvider);
    try {
      if (_registering) {
        await repository.register(
          name: _name.text,
          email: _email.text,
          password: _password.text,
        );
      } else {
        await repository.signIn(
          email: _email.text,
          password: _password.text,
        );
      }
      if (mounted) context.pop();
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resetPassword() async {
    final strings = ref.read(stringsProvider);
    final address = _email.text.trim();
    if (address.isEmpty) {
      setState(() => _error = 'Enter your email address first.');
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(authRepositoryProvider).sendPasswordReset(address);
      messenger.showSnackBar(SnackBar(content: Text(strings.resetSent)));
    } on AuthFailure catch (failure) {
      if (mounted) setState(() => _error = failure.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _registering ? strings.register : strings.signIn,
          style: context.texts.titleLarge,
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            Gap.page,
            Gap.xl,
            Gap.page,
            Gap.xxl,
          ),
          children: [
            // Aligned, not bare: a ListView hands its children tight cross-axis
            // constraints, so a sized mark here would stretch to the full width
            // of the screen.
            const Align(
              alignment: Alignment.centerLeft,
              child: AppLogo(size: 52),
            ),
            const SizedBox(height: Gap.lg),
            Text(strings.appName, style: context.texts.headlineMedium),
            const SizedBox(height: Gap.sm),
            // Says plainly why an account exists at all. Nobody should think
            // the news has just been put behind a login.
            Text(strings.signInBlurb, style: context.texts.bodyMedium),

            const SizedBox(height: Gap.xl),

            Form(
              key: _formKey,
              child: Column(
                children: [
                  if (_registering) ...[
                    _Field(
                      controller: _name,
                      label: strings.yourName,
                      icon: Icons.person_outline,
                      textInputAction: TextInputAction.next,
                      validator: (value) =>
                          (value ?? '').trim().isEmpty
                          ? 'Enter your name.'
                          : null,
                    ),
                    const SizedBox(height: Gap.md),
                  ],
                  _Field(
                    controller: _email,
                    label: strings.email,
                    icon: Icons.mail_outline,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    validator: (value) {
                      final text = (value ?? '').trim();
                      if (text.isEmpty) return 'Enter your email address.';
                      if (!text.contains('@') || !text.contains('.')) {
                        return 'That does not look like an email address.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: Gap.md),
                  _Field(
                    controller: _password,
                    label: strings.password,
                    icon: Icons.lock_outline,
                    obscure: _obscure,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    suffix: IconButton(
                      icon: Icon(
                        _obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                    validator: (value) {
                      final text = value ?? '';
                      if (text.isEmpty) return 'Enter your password.';
                      if (_registering && text.length < 6) {
                        return 'Use at least six characters.';
                      }
                      return null;
                    },
                  ),
                ],
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: Gap.md),
              _ErrorBanner(message: _error!),
            ],

            const SizedBox(height: Gap.xl),

            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : Text(_registering ? strings.register : strings.signIn),
            ),

            if (!_registering) ...[
              const SizedBox(height: Gap.sm),
              TextButton(
                onPressed: _busy ? null : _resetPassword,
                child: Text(strings.forgotPassword),
              ),
            ],

            const SizedBox(height: Gap.sm),
            Center(
              child: TextButton.icon(
                onPressed: () => context.pushReplacement('/sign-in'),
                icon: const Icon(Icons.smartphone, size: 18),
                label: Text(strings.usePhoneInstead),
              ),
            ),

            const SizedBox(height: Gap.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _registering ? strings.haveAccount : strings.needAccount,
                  style: context.texts.bodyMedium,
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                          _registering = !_registering;
                          _error = null;
                        }),
                  child: Text(
                    _registering ? strings.signIn : strings.register,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.icon,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.obscure = false,
    this.suffix,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscure;
  final Widget? suffix;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      obscureText: obscure,
      onFieldSubmitted: onSubmitted,
      autocorrect: false,
      style: context.texts.bodyLarge,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: suffix,
        filled: true,
        fillColor: context.brand.muted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.md),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.md),
          borderSide: BorderSide(color: context.brand.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.md),
          borderSide: BorderSide(color: context.scheme.primary, width: 1.6),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Gap.md),
      decoration: BoxDecoration(
        color: context.scheme.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.error_outline,
            size: 18,
            color: context.scheme.error,
          ),
          const SizedBox(width: Gap.sm),
          Expanded(
            child: Text(
              message,
              style: context.texts.bodyMedium?.copyWith(
                color: context.scheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
