import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/matrimony.dart';
import '../../data/repositories/matrimony_repository.dart';
import '../../state/auth.dart';
import '../../state/matrimony.dart';
import '../../state/preferences.dart';
import '../common/states.dart';
import 'widgets/filter_sheet.dart';
import 'widgets/interest_lists.dart';
import 'widgets/profile_card.dart';

/// The matrimony section.
///
/// Everything inside is wrapped in the rose accent, which is how the web marks
/// this as a separate place from the newsroom. It matters more on a phone: the
/// section fills the whole screen, so there is no surrounding chrome to tell a
/// reader they have left the news behind.
///
/// Signed out, this is a doorway rather than a wall — it explains what the
/// section is and why it needs an account before asking for one.
class MatrimonyHomePage extends ConsumerWidget {
  const MatrimonyHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionTheme.matrimony(
      context: context,
      child: const _MatrimonyScaffold(),
    );
  }
}

class _MatrimonyScaffold extends ConsumerWidget {
  const _MatrimonyScaffold();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final signedIn = ref.watch(isSignedInProvider);
    final member = ref.watch(memberProvider).value;

    if (!signedIn) return _SignInGate(strings: strings);

    // An account exists but the association has blocked it. Say so once,
    // plainly, instead of letting every action fail on its own.
    if (member != null && member.disabled) {
      return Scaffold(
        appBar: AppBar(title: Text(strings.matrimony)),
        body: EmptyState(
          icon: Icons.block,
          title: strings.accountBlocked,
          body: strings.matrimonyBlurb,
        ),
      );
    }

    return const _MatrimonyTabs();
  }
}

/// What a signed-out reader sees.
class _SignInGate extends StatelessWidget {
  const _SignInGate({required this.strings});

  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return Scaffold(
      appBar: AppBar(title: Text(strings.matrimony)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Gap.page, Gap.xxl, Gap.page, Gap.xl),
        children: [
          Center(
            child: Container(
              height: 72,
              width: 72,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: brand.matrimony.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.favorite_outline,
                size: 32,
                color: brand.matrimony,
              ),
            ),
          ),
          const SizedBox(height: Gap.xl),
          Text(
            strings.matrimony,
            textAlign: TextAlign.center,
            style: context.texts.headlineMedium,
          ),
          const SizedBox(height: Gap.md),
          Text(
            strings.matrimonyBlurb,
            textAlign: TextAlign.center,
            style: context.texts.bodyMedium,
          ),

          const SizedBox(height: Gap.xxl),

          // The three promises the section makes. Stated up front because they
          // are the reasons somebody would trust it with a date of birth.
          _Promise(
            icon: Icons.verified_outlined,
            text: strings.isTamil
                ? 'ஒவ்வொரு தகவலும் சங்கத்தால் பரிசீலிக்கப்படுகிறது.'
                : 'Every profile is reviewed by the association before it appears.',
          ),
          _Promise(
            icon: Icons.lock_outline,
            text: strings.contactLocked,
          ),
          _Promise(
            icon: Icons.visibility_off_outlined,
            text: strings.isTamil
                ? 'உள்நுழைந்த உறுப்பினர்கள் மட்டுமே தகவல்களைப் பார்க்க முடியும்.'
                : 'Only signed-in members can see profiles. Nothing here is public.',
          ),

          const SizedBox(height: Gap.xxl),

          FilledButton(
            onPressed: () => context.push('/sign-in'),
            child: Text(strings.signIn),
          ),
          const SizedBox(height: Gap.sm),
          Text(
            strings.signInBlurb,
            textAlign: TextAlign.center,
            style: context.texts.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _Promise extends StatelessWidget {
  const _Promise({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;

    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 19, color: brand.matrimony),
          const SizedBox(width: Gap.md),
          Expanded(
            child: Text(text, style: context.texts.bodyMedium),
          ),
        ],
      ),
    );
  }
}

/// Browse, interests, and the member's own listing.
class _MatrimonyTabs extends ConsumerWidget {
  const _MatrimonyTabs();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final pending = ref.watch(pendingInterestCountProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(strings.matrimony, style: context.texts.titleLarge),
          bottom: TabBar(
            labelStyle: context.texts.labelLarge,
            indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: context.brand.border,
            tabs: [
              Tab(text: strings.browseProfiles),
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(strings.interests),
                    if (pending > 0) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: context.brand.saffron,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '$pending',
                          style: context.texts.labelSmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Tab(text: strings.myProfile),
            ],
          ),
        ),
        body: const TabBarView(
          children: [_BrowseTab(), InterestsTab(), _MyProfileTab()],
        ),
      ),
    );
  }
}

class _BrowseTab extends ConsumerWidget {
  const _BrowseTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final results = ref.watch(matrimonySearchProvider);
    final filters = ref.watch(matrimonyFiltersProvider);

    return Column(
      children: [
        _SearchBar(strings: strings, filters: filters),
        Expanded(
          child: switch (results) {
            AsyncLoading() => const Center(child: CircularProgressIndicator()),
            AsyncError() => ErrorStateView(
              title: strings.offlineTitle,
              body: strings.offlineBody,
              retryLabel: strings.retry,
              onRetry: () => ref.invalidate(matrimonySearchProvider),
            ),
            AsyncData(:final value) when value.isEmpty => EmptyState(
              icon: Icons.favorite_outline,
              title: strings.noProfiles,
              body: strings.noProfilesBody,
              action: filters.isEmpty
                  ? null
                  : OutlinedButton(
                      onPressed: () =>
                          ref.read(matrimonyFiltersProvider.notifier).clear(),
                      child: Text(strings.clearFilters),
                    ),
            ),
            AsyncData(:final value) => RefreshIndicator(
              onRefresh: () async => ref.invalidate(matrimonySearchProvider),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(
                  Gap.page,
                  Gap.sm,
                  Gap.page,
                  Gap.xxl,
                ),
                itemCount: value.length,
                itemBuilder: (context, index) => Padding(
                  // The cards are tall now, so they get a gap that reads as a
                  // gap rather than a hairline between two photographs.
                  padding: const EdgeInsets.only(bottom: Gap.lg),
                  child: MatrimonyProfileCard(profile: value[index]),
                ),
              ),
            ),
          },
        ),
      ],
    );
  }
}

class _SearchBar extends ConsumerStatefulWidget {
  const _SearchBar({required this.strings, required this.filters});

  final Strings strings;
  final MatrimonyFilters filters;

  @override
  ConsumerState<_SearchBar> createState() => _SearchBarState();
}

class _SearchBarState extends ConsumerState<_SearchBar> {
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    _controller.text = ref.read(matrimonyFiltersProvider).search;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;
    final brand = context.brand;
    final active = ref.watch(
      matrimonyFiltersProvider.select((filters) => filters.activeCount),
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.md, Gap.page, Gap.sm),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              onSubmitted: (value) =>
                  ref.read(matrimonyFiltersProvider.notifier).setSearch(value),
              textInputAction: TextInputAction.search,
              style: context.texts.bodyMedium?.copyWith(
                color: context.scheme.onSurface,
              ),
              decoration: InputDecoration(
                hintText: strings.matrimonySearchHint,
                hintStyle: context.texts.bodyMedium,
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                filled: true,
                fillColor: brand.muted,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radii.md),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: Gap.sm),
          Badge(
            isLabelVisible: active > 0,
            label: Text('$active'),
            backgroundColor: brand.saffron,
            child: IconButton.filledTonal(
              onPressed: () => showMatrimonyFilterSheet(context),
              icon: const Icon(Icons.tune),
              tooltip: strings.filters,
            ),
          ),
        ],
      ),
    );
  }
}

/// The member's own listing, or an invitation to create one.
class _MyProfileTab extends ConsumerWidget {
  const _MyProfileTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final mine = ref.watch(myMatrimonyProfileProvider);

    return switch (mine) {
      AsyncLoading() => const Center(child: CircularProgressIndicator()),
      AsyncError() => ErrorStateView(
        title: strings.offlineTitle,
        body: strings.offlineBody,
        retryLabel: strings.retry,
        onRetry: () => ref.invalidate(myMatrimonyProfileProvider),
      ),
      AsyncData(:final value) when value == null => EmptyState(
        icon: Icons.person_add_alt,
        title: strings.createProfile,
        body: strings.matrimonyBlurb,
        action: FilledButton(
          onPressed: () => context.push('/matrimony/edit'),
          child: Text(strings.createProfile),
        ),
      ),
      AsyncData(:final value) => _MyProfileSummary(profile: value!),
    };
  }
}

class _MyProfileSummary extends ConsumerWidget {
  const _MyProfileSummary({required this.profile});

  final MatrimonyProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final brand = context.brand;

    final (message, tone) = switch (profile.status) {
      MatrimonyStatus.pending => (strings.profilePending, brand.saffron),
      MatrimonyStatus.approved => (strings.profileLive, brand.matrimony),
      MatrimonyStatus.rejected => (
        strings.profileRejected,
        context.scheme.error,
      ),
      MatrimonyStatus.paused => (
        strings.profilePaused,
        brand.mutedForeground,
      ),
      MatrimonyStatus.married => (
        strings.markMarried,
        brand.mutedForeground,
      ),
    };

    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.lg, Gap.page, Gap.xxl),
      children: [
        Container(
          padding: const EdgeInsets.all(Gap.md),
          decoration: BoxDecoration(
            color: tone.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(Radii.md),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline, size: 18, color: tone),
              const SizedBox(width: Gap.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      message,
                      style: context.texts.bodyMedium?.copyWith(color: tone),
                    ),
                    // The moderator's note, when they sent it back. Without
                    // this the member has no idea what to change.
                    if (profile.reviewNote != null) ...[
                      const SizedBox(height: Gap.sm),
                      Text(
                        profile.reviewNote!,
                        style: context.texts.bodyMedium,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: Gap.xl),
        Text(profile.name, style: context.texts.headlineSmall),
        const SizedBox(height: 4),
        Text(
          [
            if (profile.age != null) '${profile.age}',
            profile.heightLabel,
            profile.hometown,
          ].where((part) => part.isNotEmpty).join(' · '),
          style: context.texts.bodyMedium,
        ),

        const SizedBox(height: Gap.xl),
        FilledButton.icon(
          onPressed: () => context.push('/matrimony/edit'),
          icon: const Icon(Icons.edit_outlined, size: 18),
          label: Text(strings.editProfile),
        ),
        const SizedBox(height: Gap.sm),
        OutlinedButton.icon(
          onPressed: () => context.push('/matrimony/${profile.id}'),
          icon: const Icon(Icons.visibility_outlined, size: 18),
          label: Text(
            strings.isTamil ? 'மற்றவர்கள் பார்ப்பது' : 'See how others see it',
          ),
        ),

        const SizedBox(height: Gap.xl),
        Divider(color: brand.border),
        const SizedBox(height: Gap.md),

        // Status controls. `approved` is deliberately absent: the rules refuse
        // it from an owner, and offering a button that always fails would be
        // worse than not offering one.
        if (profile.status != MatrimonyStatus.paused)
          _StatusAction(
            icon: Icons.pause_circle_outline,
            label: strings.pauseProfile,
            onTap: () => ref
                .read(matrimonyRepositoryProvider)
                .setOwnStatus(profile.id, MatrimonyStatus.paused),
          ),
        if (profile.status == MatrimonyStatus.paused)
          _StatusAction(
            icon: Icons.play_circle_outline,
            label: strings.resumeProfile,
            onTap: () => ref
                .read(matrimonyRepositoryProvider)
                .setOwnStatus(profile.id, MatrimonyStatus.pending),
          ),
        if (profile.status != MatrimonyStatus.married)
          _StatusAction(
            icon: Icons.celebration_outlined,
            label: strings.markMarried,
            onTap: () => ref
                .read(matrimonyRepositoryProvider)
                .setOwnStatus(profile.id, MatrimonyStatus.married),
          ),
        _StatusAction(
          icon: Icons.delete_outline,
          label: strings.deleteProfile,
          destructive: true,
          onTap: () => _confirmDelete(context, ref, strings, profile.id),
        ),
      ],
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Strings strings,
    String uid,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.deleteProfile),
        content: Text(
          strings.isTamil
              ? 'உங்கள் தகவலும் தொடர்பு விவரங்களும் நிரந்தரமாக நீக்கப்படும்.'
              : 'Your listing and contact details will be permanently removed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(strings.isTamil ? 'வேண்டாம்' : 'Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(strings.isTamil ? 'நீக்கு' : 'Delete'),
          ),
        ],
      ),
    );

    if (confirmed ?? false) {
      await ref.read(matrimonyRepositoryProvider).deleteProfile(uid);
    }
  }
}

class _StatusAction extends StatelessWidget {
  const _StatusAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive
        ? context.scheme.error
        : context.brand.mutedForeground;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Gap.md),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: Gap.md),
            Text(
              label,
              style: context.texts.bodyLarge?.copyWith(
                color: destructive ? color : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
