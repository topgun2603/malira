import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/repositories/auth_repository.dart';
import '../../state/auth.dart';
import '../../state/preferences.dart';
import '../common/app_logo.dart';

/// Sign in with a mobile number.
///
/// The primary route for this readership: rural, older, and largely without an
/// email address. A number they already know, and no password to remember or
/// to reset over the phone with somebody at the association.
///
/// Two steps on one screen rather than two routes, so "change number" is a step
/// back rather than a navigation problem, and so the code screen still shows
/// the number it was sent to.
class PhoneSignInPage extends ConsumerStatefulWidget {
  const PhoneSignInPage({super.key});

  @override
  ConsumerState<PhoneSignInPage> createState() => _PhoneSignInPageState();
}

class _PhoneSignInPageState extends ConsumerState<PhoneSignInPage> {
  final _number = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();

  PhoneVerification? _verification;
  String? _sentTo;
  String? _error;
  bool _busy = false;

  /// Seconds until a resend is allowed. Firebase rate-limits SMS hard, and a
  /// button that can be hammered is a button that gets the project throttled.
  int _resendIn = 0;
  Timer? _ticker;

  @override
  void dispose() {
    _ticker?.cancel();
    _number.dispose();
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  void _startResendCountdown() {
    _ticker?.cancel();
    setState(() => _resendIn = 45);
    _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      setState(() => _resendIn -= 1);
      if (_resendIn <= 0) timer.cancel();
    });
  }

  Future<void> _send({bool resend = false}) async {
    final strings = ref.read(stringsProvider);
    final normalised = AuthRepository.normaliseIndianNumber(_number.text);

    if (normalised == null) {
      setState(() => _error = strings.badNumber);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    await ref
        .read(authRepositoryProvider)
        .sendSmsCode(
          phoneNumber: normalised,
          resendToken: resend ? _verification?.resendToken : null,
          onCodeSent: (verification) {
            if (!mounted) return;
            setState(() {
              _verification = verification;
              _sentTo = normalised;
              _busy = false;
            });
            _startResendCountdown();
            _codeFocus.requestFocus();
          },
          onFailed: (failure) {
            if (!mounted) return;
            setState(() {
              _error = failure.message;
              _busy = false;
            });
          },
          // Android often reads the SMS itself. When it does, the sign-in is
          // already finished and this screen simply gets out of the way.
          onAutoVerified: () {
            if (mounted) context.pop();
          },
        );
  }

  Future<void> _confirm() async {
    final strings = ref.read(stringsProvider);
    final verification = _verification;
    if (verification == null) return;

    if (_code.text.trim().length < 6) {
      setState(() => _error = strings.enterCode);
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref
          .read(authRepositoryProvider)
          .confirmSmsCode(
            verification: verification,
            smsCode: _code.text,
            phoneNumber: _sentTo ?? '',
          );
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

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final onCodeStep = _verification != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(strings.signIn, style: context.texts.titleLarge),
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
            const Align(
              alignment: Alignment.centerLeft,
              child: AppLogo(size: 52),
            ),
            const SizedBox(height: Gap.lg),
            Text(
              onCodeStep ? strings.enterCode : strings.appName,
              style: context.texts.headlineMedium,
            ),
            const SizedBox(height: Gap.sm),
            Text(
              onCodeStep
                  ? strings.codeSentTo(_sentTo ?? '')
                  : strings.signInBlurb,
              style: context.texts.bodyMedium,
            ),

            const SizedBox(height: Gap.xl),

            if (!onCodeStep) ...[
              _NumberField(controller: _number, onSubmitted: (_) => _send()),
              const SizedBox(height: Gap.sm),
              Text(strings.smsCharges, style: context.texts.bodySmall),
            ] else
              _CodeField(
                controller: _code,
                focusNode: _codeFocus,
                onSubmitted: (_) => _confirm(),
              ),

            if (_error != null) ...[
              const SizedBox(height: Gap.md),
              _ErrorBanner(message: _error!),
            ],

            const SizedBox(height: Gap.xl),

            FilledButton(
              onPressed: _busy ? null : (onCodeStep ? _confirm : _send),
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : Text(onCodeStep ? strings.continueLabel : strings.sendCode),
            ),

            if (onCodeStep) ...[
              const SizedBox(height: Gap.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: () => setState(() {
                      _verification = null;
                      _code.clear();
                      _error = null;
                    }),
                    child: Text(strings.changeNumber),
                  ),
                  TextButton(
                    onPressed: _resendIn > 0 || _busy
                        ? null
                        : () => _send(resend: true),
                    child: Text(
                      _resendIn > 0
                          ? strings.resendIn(_resendIn)
                          : strings.resendCode,
                    ),
                  ),
                ],
              ),
            ] else ...[
              const SizedBox(height: Gap.lg),
              Center(
                child: TextButton(
                  onPressed: () => context.pushReplacement('/sign-in/email'),
                  child: Text(strings.useEmailInstead),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// The number field, with a fixed +91.
///
/// Fixed rather than a country picker: every reader this is built for is in
/// India, and a picker would be one more control to get wrong for a case that
/// does not arise. The parser still accepts a pasted +91 or a leading zero.
class _NumberField extends StatelessWidget {
  const _NumberField({required this.controller, required this.onSubmitted});

  final TextEditingController controller;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return Row(
      children: [
        Container(
          height: 58,
          padding: const EdgeInsets.symmetric(horizontal: Gap.md),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: brand.muted,
            borderRadius: BorderRadius.circular(Radii.md),
            border: Border.all(color: brand.border),
          ),
          child: Text('+91', style: context.texts.titleMedium),
        ),
        const SizedBox(width: Gap.sm),
        Expanded(
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.done,
            onSubmitted: onSubmitted,
            autofocus: true,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: context.texts.headlineSmall?.copyWith(letterSpacing: 1.5),
            decoration: InputDecoration(
              counterText: '',
              hintText: '9876543210',
              hintStyle: context.texts.headlineSmall?.copyWith(
                color: brand.mutedForeground.withValues(alpha: 0.5),
                letterSpacing: 1.5,
              ),
              filled: true,
              fillColor: brand.muted,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: Gap.md,
                vertical: Gap.md,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(Radii.md),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(Radii.md),
                borderSide: BorderSide(color: brand.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(Radii.md),
                borderSide: BorderSide(
                  color: context.scheme.primary,
                  width: 1.6,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// The six digits, spaced out and big.
class _CodeField extends StatelessWidget {
  const _CodeField({
    required this.controller,
    required this.focusNode,
    required this.onSubmitted,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onSubmitted;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return TextField(
      controller: controller,
      focusNode: focusNode,
      keyboardType: TextInputType.number,
      textInputAction: TextInputAction.done,
      onSubmitted: onSubmitted,
      maxLength: 6,
      textAlign: TextAlign.center,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      // Lets the keyboard offer the code straight from the SMS.
      autofillHints: const [AutofillHints.oneTimeCode],
      style: context.texts.displaySmall?.copyWith(letterSpacing: 12),
      decoration: InputDecoration(
        counterText: '',
        hintText: '······',
        hintStyle: context.texts.displaySmall?.copyWith(
          color: brand.mutedForeground.withValues(alpha: 0.4),
          letterSpacing: 12,
        ),
        filled: true,
        fillColor: brand.muted,
        contentPadding: const EdgeInsets.symmetric(vertical: Gap.lg),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.md),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Radii.md),
          borderSide: BorderSide(color: brand.border),
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
          Icon(Icons.error_outline, size: 18, color: context.scheme.error),
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
