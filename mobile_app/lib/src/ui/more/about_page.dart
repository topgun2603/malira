import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/app_logo.dart';
import '../news/widgets/masthead.dart';

/// About and contact.
///
/// Every word on this page comes from `settings/app` in Firestore, which the
/// association edits in the admin panel. Nothing is hardcoded: a phone number
/// that can only be changed by shipping a new build is a phone number that
/// will be wrong.
class AboutPage extends ConsumerWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final settings = ref.watch(appSettingsProvider).value;
    final brand = context.brand;

    Future<void> launch(String url) async {
      final target = Uri.tryParse(url);
      if (target == null || url.isEmpty) return;
      await launchUrl(target, mode: LaunchMode.externalApplication);
    }

    final body = settings == null
        ? ''
        : strings.pick(settings.aboutBody, settings.aboutBodyTa);

    return Scaffold(
      appBar: PageAppBar(title: strings.about),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.xxl),
        children: [
          Row(
            children: [
              const AppLogo(size: 44),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Text(
                  settings?.aboutTitle.isNotEmpty ?? false
                      ? settings!.aboutTitle
                      : strings.appName,
                  style: context.texts.headlineSmall,
                ),
              ),
            ],
          ),

          if (body.isNotEmpty) ...[
            const SizedBox(height: Gap.xl),
            Text(body, style: context.texts.bodyLarge),
          ],

          if (settings != null) ...[
            const SizedBox(height: Gap.xl),
            Divider(color: brand.border),
            const SizedBox(height: Gap.lg),
            Text(strings.contact, style: context.texts.titleMedium),
            const SizedBox(height: Gap.md),

            if (settings.contactPhone.isNotEmpty)
              _ContactRow(
                icon: Icons.call_outlined,
                value: settings.contactPhone,
                onTap: () => launch('tel:${settings.contactPhone}'),
              ),
            if (settings.contactEmail.isNotEmpty)
              _ContactRow(
                icon: Icons.mail_outline,
                value: settings.contactEmail,
                onTap: () => launch('mailto:${settings.contactEmail}'),
              ),
            if (settings.contactAddress.isNotEmpty)
              _ContactRow(
                icon: Icons.place_outlined,
                value: settings.contactAddress,
              ),
          ],
        ],
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.icon, required this.value, this.onTap});

  final IconData icon;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Gap.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: brand.mutedForeground),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Text(
                value,
                style: context.texts.bodyLarge?.copyWith(
                  color: onTap == null ? null : context.scheme.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
