import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:go_router/go_router.dart';

import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/matrimony.dart';
import '../../data/repositories/matrimony_repository.dart';
import '../../state/auth.dart';
import '../../state/matrimony.dart';
import '../../state/providers.dart';
import '../../state/preferences.dart';
import '../common/app_logo.dart';
import '../common/states.dart';
import 'widgets/filter_sheet.dart';
import 'widgets/interest_lists.dart';
import 'widgets/matrimony_backdrop.dart';
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
    return Scaffold(
      // The artwork is the screen. An app bar over it would only put a grey
      // band across the sky the painting leaves open on purpose.
      body: MatrimonyBackdrop(
        child: Column(
          children: [
            Expanded(child: _GateCopy(strings: strings)),
            // Sits on the artwork rather than above it, so the painting keeps
            // the full height of the screen and the note still reads.
            _GateFootnote(strings: strings),
          ],
        ),
      ),
    );
  }
}

/// The masthead and the call to action, scrolling under their own scrim.
class _GateCopy extends StatelessWidget {
  const _GateCopy({required this.strings});

  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final ground = context.backdropGround;

    return LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            // The scrim is sized to the copy rather than to a fixed fraction
            // of the screen, because how far down the copy reaches is not a
            // constant: this audience is offered a text size control, and at
            // the largest setting the old fixed band ended above the last
            // line and left it sitting on the couple's white dress, which is
            // the brightest thing in the painting. Hugging the content keeps
            // it readable at any size, and on a normal setting it still stops
            // well above the hills.
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [ground, ground, ground.withValues(alpha: 0.0)],
                  stops: const [0.0, 0.78, 1.0],
                ),
              ),
              child: Padding(
                // The status bar inset is paid here rather than by a SafeArea
                // outside, so the scrim runs to the top edge instead of
                // starting below it and leaving a bright strip above.
                padding: EdgeInsets.fromLTRB(
                  Gap.page,
                  MediaQuery.viewPaddingOf(context).top + Gap.xl,
                  Gap.page,
                  Gap.xxl,
                ),
                child: ConstrainedBox(
                  // Floor, not a ceiling: on a tall phone the copy stops above
                  // the hills; on a short one it grows past them and takes its
                  // scrim with it, which is better than shrinking the type.
                  constraints: BoxConstraints(
                    minHeight:
                        constraints.maxHeight *
                            MatrimonyBackdrop.contentFraction -
                        Gap.xl * 2,
                  ),
                  child: _GateContent(strings: strings),
                ),
              ),
            ),
          ),
    );
  }
}

/// The note about what an account is actually for, held to the bottom edge.
///
/// It is a footnote rather than a line under the button: it qualifies the
/// whole screen instead of the tap, and at the bottom it stops pushing the
/// call to action up the page. The gradient is what makes that safe — it
/// lands on the couple's hem, the palest part of the painting, and fades in
/// from nothing so the join never reads as a band.
class _GateFootnote extends StatelessWidget {
  const _GateFootnote({required this.strings});

  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final ground = context.backdropGround;

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            ground.withValues(alpha: 0.0),
            ground.withValues(alpha: 0.94),
            ground,
          ],
          stops: const [0.0, 0.62, 1.0],
        ),
      ),
      child: Padding(
        // Deep at the top to give the gradient somewhere to fade in, and the
        // bottom inset paid here because the shell's navigation bar sits
        // outside this Scaffold.
        padding: EdgeInsets.fromLTRB(
          Gap.page,
          Gap.xxl,
          Gap.page,
          Gap.lg + MediaQuery.viewPaddingOf(context).bottom,
        ),
        child: Text(
          strings.signInBlurb,
          textAlign: TextAlign.center,
          style: context.texts.bodySmall?.copyWith(
            color: context.backdropMutedInk,
          ),
        ),
      ),
    );
  }
}

class _GateContent extends StatelessWidget {
  const _GateContent({required this.strings});

  final Strings strings;

  @override
  Widget build(BuildContext context) {
    // Not the theme's onSurface: the backdrop is a painting, and in the light
    // theme it stays cream whatever the rest of the app is doing.
    final ink = context.backdropInk;
    final accent = context.backdropAccent;

    // The mark and the name are the masthead of the section and the painting
    // behind them is symmetrical, so they sit on the axis it already has.
    // Everything below stays ranged left: centred body copy is harder to read,
    // and this audience is often reading it at a raised text size.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Column(
            children: [
              const AppLogo(size: 52),
              const SizedBox(height: Gap.lg),
              AppWordmark(strings: strings, color: ink),
            ],
          ),
        ),

        const SizedBox(height: Gap.xl),

        Text(
          strings.matrimonyBlurb,
          style: context.texts.bodyLarge?.copyWith(color: ink, height: 1.45),
        ),

        const SizedBox(height: Gap.xl),

        // Full width. It clears the couple on the vertical now that the
        // footnote has moved out from under it, so there is nothing left for a
        // narrower measure to protect.
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: () => context.push('/sign-in'),
            style: FilledButton.styleFrom(
              backgroundColor: accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: Gap.lg),
            ),
            child: Text(strings.signIn),
          ),
        ),
      ],
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

    // Browsing needs a plan, and this app cannot sell one: Play requires its
    // own billing for anything bought inside an app, at 15-30%, so purchases
    // are web-only. The wall therefore carries a door — a wall without one
    // would just be an app that stops working.
    if (!ref.watch(isPremiumProvider)) {
      final url = ref.watch(appSettingsProvider).value?.subscribeUrl.trim() ?? '';
      return EmptyState(
        icon: Icons.lock_outline,
        title: strings.browsingIsForMembers,
        body: strings.browsingIsForMembersBody,
        action: url.isEmpty
            ? null
            : FilledButton(
                onPressed: () => launchUrl(
                  Uri.parse(url),
                  mode: LaunchMode.externalApplication,
                ),
                child: Text(strings.subscribeOnWeb),
              ),
      );
    }

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
  final _focus = FocusNode();

  /// What is in the field, which is not the same as the term being searched on.
  ///
  /// The term is only applied on submit. Tracking the two apart is what lets
  /// the clear control appear the moment there is something to clear, and lets
  /// the suggestions follow the typing rather than the last search.
  String _typed = '';

  @override
  void initState() {
    super.initState();
    _controller.text = ref.read(matrimonyFiltersProvider).search;
    _typed = _controller.text;
    _controller.addListener(() {
      if (_controller.text != _typed) {
        setState(() => _typed = _controller.text);
      }
    });
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _commit(String value) {
    _controller.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
    ref.read(matrimonyFiltersProvider.notifier).setSearch(value);
    _focus.unfocus();
  }

  /// Names, towns and occupations from the profiles already loaded that contain
  /// what has been typed so far.
  ///
  /// Drawn from the results on screen rather than a query per keystroke: the
  /// term is applied on submit, so while somebody is typing, the list behind
  /// this field is still the one they are narrowing. It costs no reads, and it
  /// can only ever offer something that will actually return a profile.
  List<String> _suggestions() {
    final term = _typed.trim().toLowerCase();
    if (term.isEmpty) return const [];

    final profiles = ref.watch(matrimonySearchProvider).value ?? const [];
    final seen = <String>{};
    final out = <String>[];

    for (final profile in profiles) {
      for (final candidate in [
        profile.name,
        profile.hometown,
        profile.occupation,
      ]) {
        final value = candidate.trim();
        if (value.isEmpty) continue;
        final lower = value.toLowerCase();
        // Offering back exactly what is already typed gains nothing.
        if (lower == term || !lower.contains(term)) continue;
        if (!seen.add(lower)) continue;
        out.add(value);
        if (out.length == 6) return out;
      }
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final strings = widget.strings;
    final brand = context.brand;
    final active = ref.watch(
      matrimonyFiltersProvider.select((filters) => filters.activeCount),
    );
    final suggestions = _focus.hasFocus ? _suggestions() : const <String>[];

    return Padding(
      padding: const EdgeInsets.fromLTRB(Gap.page, Gap.md, Gap.page, Gap.sm),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  focusNode: _focus,
                  onSubmitted: _commit,
                  textInputAction: TextInputAction.search,
                  style: context.texts.bodyMedium?.copyWith(
                    color: context.scheme.onSurface,
                  ),
                  decoration: InputDecoration(
                    hintText: strings.matrimonySearchHint,
                    hintStyle: context.texts.bodyMedium,
                    prefixIcon: const Icon(Icons.search, size: 20),
                    // Clearing puts the list back rather than only emptying the
                    // field: dropping the committed term is the point, and an
                    // empty box over filtered results is how this looked before.
                    suffixIcon: _typed.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.close, size: 18),
                            tooltip: strings.clearSearch,
                            onPressed: () => _commit(''),
                          ),
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
          if (suggestions.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: Gap.xs),
              decoration: BoxDecoration(
                color: context.scheme.surface,
                borderRadius: BorderRadius.circular(Radii.md),
                border: Border.all(color: brand.border),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final suggestion in suggestions)
                    InkWell(
                      onTap: () => _commit(suggestion),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: Gap.md,
                          vertical: Gap.sm,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.search,
                              size: 16,
                              color: brand.mutedForeground,
                            ),
                            const SizedBox(width: Gap.sm),
                            Expanded(
                              child: Text(
                                suggestion,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: context.texts.bodyMedium,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
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

        // Status controls. `approved` is not offered directly: the rules refuse
        // it from an owner except as the far end of a resume, which is what the
        // resume action below performs.
        if (profile.status != MatrimonyStatus.paused)
          _StatusAction(
            icon: Icons.pause_circle_outline,
            label: strings.pauseProfile,
            onTap: () => ref
                .read(matrimonyRepositoryProvider)
                .setOwnStatus(
                  profile.id,
                  MatrimonyStatus.paused,
                  // Recorded so the resume knows whether this listing had
                  // already cleared review.
                  current: profile.status,
                ),
          ),
        if (profile.status == MatrimonyStatus.paused)
          _StatusAction(
            icon: Icons.play_circle_outline,
            label: strings.resumeProfile,
            onTap: () => ref
                .read(matrimonyRepositoryProvider)
                .resumeOwnListing(profile.id, profile.pausedFrom),
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
