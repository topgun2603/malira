import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/member.dart';
import '../../state/auth.dart';
import '../../state/preferences.dart';
import '../common/app_logo.dart';

/// The app drawer.
///
/// Holds the account and the things that are not one of the five tabs. The
/// account header is the top item deliberately: signing in is the one action
/// the tab bar cannot express, and it is the thing matrimony will ask for.
///
/// Matrimony itself is not listed here — it is the lifted centre tab, and
/// repeating it would only make the drawer look like the more complete
/// navigation, which it is not.
class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final member = ref.watch(memberProvider).value;
    final signedIn = ref.watch(isSignedInProvider);

    void go(String route) {
      Navigator.of(context).pop();
      context.push(route);
    }

    return Drawer(
      backgroundColor: context.scheme.surface,
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _AccountHeader(
              member: member,
              signedIn: signedIn,
              onTap: () {
                Navigator.of(context).pop();
                context.push(signedIn ? '/account' : '/sign-in');
              },
            ),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: Gap.sm),
                children: [
                  // Saved lives here rather than in the tab bar: a personal
                  // shelf somebody visits occasionally, not one of the five
                  // things the app is for.
                  _DrawerItem(
                    icon: Icons.bookmark_border,
                    label: strings.saved,
                    onTap: () => go('/saved'),
                  ),
                  // The bell only appears on the front page. This is how the
                  // announcements are reached from anywhere else.
                  _DrawerItem(
                    icon: Icons.notifications_none,
                    label: strings.notifications,
                    onTap: () => go('/notifications'),
                  ),
                  _DrawerItem(
                    icon: Icons.search,
                    label: strings.search,
                    onTap: () => go('/search'),
                  ),
                  _DrawerItem(
                    icon: Icons.calendar_month_outlined,
                    label: strings.archive,
                    onTap: () => go('/archive'),
                  ),

                  const _DrawerDivider(),

                  _DrawerItem(
                    icon: Icons.settings_outlined,
                    label: strings.settings,
                    onTap: () {
                      Navigator.of(context).pop();
                      context.go('/more');
                    },
                  ),
                  _DrawerItem(
                    icon: Icons.info_outline,
                    label: strings.about,
                    onTap: () => go('/about'),
                  ),

                  if (signedIn) ...[
                    const _DrawerDivider(),
                    _DrawerItem(
                      icon: Icons.logout,
                      label: strings.signOut,
                      onTap: () async {
                        Navigator.of(context).pop();
                        await ref.read(authRepositoryProvider).signOut();
                      },
                    ),
                  ],
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(Gap.page),
              child: Row(
                children: [
                  const AppLogo(size: 22),
                  const SizedBox(width: Gap.sm),
                  Text(strings.appName, style: context.texts.bodySmall),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The navy header. Same rail colour as the launcher tile and the same family
/// as the blue masthead, so the drawer reads as part of the app furniture
/// rather than a system sheet.
class _AccountHeader extends ConsumerWidget {
  const _AccountHeader({
    required this.member,
    required this.signedIn,
    required this.onTap,
  });

  final Member? member;
  final bool signedIn;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;

    return Material(
      color: brand.rail,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(Gap.page),
          child: Row(
            children: [
              Container(
                height: 48,
                width: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: signedIn && member != null
                    ? Text(
                        member!.initial,
                        style: context.texts.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      )
                    : Icon(
                        Icons.person_outline,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
              ),
              const SizedBox(width: Gap.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      signedIn && member != null
                          ? member!.shortName
                          : strings.signIn,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.titleMedium?.copyWith(
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      signedIn && member != null
                          // A phone account with no name yet would otherwise
                          // print the same number twice.
                          ? (member!.handle ?? strings.addYourName)
                          : strings.guest,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.texts.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.72),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Gap.page,
          vertical: Gap.md,
        ),
        child: Row(
          children: [
            Icon(icon, size: 21, color: brand.mutedForeground),
            const SizedBox(width: Gap.lg),
            Expanded(
              child: Text(label, style: context.texts.bodyLarge),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerDivider extends StatelessWidget {
  const _DrawerDivider();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: Gap.page,
        vertical: Gap.sm,
      ),
      child: Divider(color: context.brand.border, height: 1),
    );
  }
}
