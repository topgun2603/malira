import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/auth.dart';
import '../../state/matrimony.dart';
import '../../state/preferences.dart';
import '../common/states.dart';
import '../news/widgets/masthead.dart';

/// The signed-in account.
class AccountPage extends ConsumerWidget {
  const AccountPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final member = ref.watch(memberProvider).value;
    final brand = context.brand;

    if (member == null) {
      return Scaffold(
        appBar: PageAppBar(title: strings.signIn),
        body: EmptyState(
          icon: Icons.person_outline,
          title: strings.guest,
          body: strings.signInBlurb,
          action: FilledButton(
            onPressed: () => context.push('/sign-in'),
            child: Text(strings.signIn),
          ),
        ),
      );
    }

    final profile = ref.watch(myMatrimonyProfileProvider).value;

    return Scaffold(
      appBar: PageAppBar(title: strings.signedInAs),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, Gap.xxl),
        children: [
          Row(
            children: [
              Container(
                height: 56,
                width: 56,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: brand.rail,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  member.initial,
                  style: context.texts.headlineSmall?.copyWith(
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: Gap.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(member.shortName, style: context.texts.titleLarge),
                    Text(
                      member.handle ?? strings.addYourName,
                      style: context.texts.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (member.disabled) ...[
            const SizedBox(height: Gap.xl),
            Container(
              padding: const EdgeInsets.all(Gap.md),
              decoration: BoxDecoration(
                color: context.scheme.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(Radii.md),
              ),
              child: Text(
                strings.accountBlocked,
                style: context.texts.bodyMedium?.copyWith(
                  color: context.scheme.error,
                ),
              ),
            ),
          ],

          const SizedBox(height: Gap.xl),
          Divider(color: brand.border),
          const SizedBox(height: Gap.md),

          // Phone accounts arrive with no name at all, and the name is what
          // other members see on an interest. Offered first for that reason.
          _Tile(
            icon: Icons.badge_outlined,
            label: member.publicName.isEmpty
                ? strings.addYourName
                : strings.yourName,
            onTap: () => _editName(context, ref, member.publicName, strings),
          ),
          // `go`, not `push`. `/matrimony` is a branch of the shell route, and
          // pushing a branch onto the root navigator builds the shell as a
          // standalone page with no branch selected — which renders nothing at
          // all and reads as a black screen, with no exception to explain it.
          // Only the top-level routes below the shell can be pushed.
          _Tile(
            icon: Icons.favorite_outline,
            iconColor: brand.matrimony,
            label: profile == null ? strings.createProfile : strings.myProfile,
            onTap: () => profile == null
                // Straight to the form: somebody who came here to create a
                // profile should not land on a tab and have to find it.
                ? context.push('/matrimony/edit')
                : context.go('/matrimony'),
          ),
          _Tile(
            icon: Icons.mail_outline,
            label: strings.interests,
            onTap: () => context.go('/matrimony'),
          ),

          const SizedBox(height: Gap.md),
          Divider(color: brand.border),
          const SizedBox(height: Gap.md),

          _Tile(
            icon: Icons.logout,
            label: strings.signOut,
            onTap: () async {
              final router = GoRouter.of(context);
              await ref.read(authRepositoryProvider).signOut();
              if (router.canPop()) router.pop();
            },
          ),
        ],
      ),
    );
  }
}

/// Sets the display name on `users/{uid}`.
///
/// Small, but it is the only way a phone account gets a name, and the name is
/// what a stranger sees when an interest arrives.
Future<void> _editName(
  BuildContext context,
  WidgetRef ref,
  String current,
  Strings strings,
) async {
  final controller = TextEditingController(text: current);

  final name = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(strings.yourName),
      content: TextField(
        controller: controller,
        autofocus: true,
        textCapitalization: TextCapitalization.words,
        decoration: InputDecoration(hintText: strings.yourName),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(strings.isTamil ? 'வேண்டாம்' : 'Cancel'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(controller.text),
          child: Text(strings.saveAction),
        ),
      ],
    ),
  );

  if (name == null || name.trim().isEmpty) return;
  await ref.read(authRepositoryProvider).setDisplayName(name);
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.iconColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Gap.md),
        child: Row(
          children: [
            Icon(icon, size: 20, color: iconColor ?? brand.mutedForeground),
            const SizedBox(width: Gap.lg),
            Expanded(child: Text(label, style: context.texts.bodyLarge)),
            Icon(Icons.chevron_right, size: 20, color: brand.mutedForeground),
          ],
        ),
      ),
    );
  }
}
