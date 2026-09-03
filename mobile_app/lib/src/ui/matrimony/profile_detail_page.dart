import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/format.dart';
import '../../core/l10n/strings.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../data/models/article.dart';
import '../../data/models/matrimony.dart';
import '../../state/auth.dart';
import '../../state/matrimony.dart';
import '../../state/providers.dart';
import '../../state/preferences.dart';
import '../common/app_image.dart';
import '../common/states.dart';

/// One listing, in full.
class MatrimonyProfilePage extends ConsumerWidget {
  const MatrimonyProfilePage({super.key, required this.uid});

  final String uid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SectionTheme.matrimony(
      context: context,
      child: _ProfileScaffold(uid: uid),
    );
  }
}

class _ProfileScaffold extends ConsumerWidget {
  const _ProfileScaffold({required this.uid});

  final String uid;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final profile = ref.watch(matrimonyProfileProvider(uid));

    return Scaffold(
      appBar: AppBar(
        actions: [
          if (ref.watch(currentUidProvider) != uid)
            IconButton(
              icon: const Icon(Icons.flag_outlined),
              tooltip: strings.report,
              onPressed: () => _report(context, ref, strings),
            ),
        ],
      ),
      body: switch (profile) {
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(matrimonyProfileProvider(uid)),
        ),
        AsyncData(:final value) when value == null => EmptyState(
          icon: Icons.person_off_outlined,
          title: strings.storyNotFound,
          body: strings.storyNotFoundBody,
        ),
        AsyncData(:final value) => _ProfileBody(
          profile: value!,
          strings: strings,
        ),
      },
      bottomNavigationBar: profile.value == null
          ? null
          : _InterestBar(profile: profile.value!, strings: strings),
    );
  }

  Future<void> _report(
    BuildContext context,
    WidgetRef ref,
    Strings strings,
  ) async {
    final controller = TextEditingController();
    final messenger = ScaffoldMessenger.of(context);

    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(strings.report),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: InputDecoration(hintText: strings.reportReason),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(strings.isTamil ? 'வேண்டாம்' : 'Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: Text(strings.report),
          ),
        ],
      ),
    );

    if (reason == null || reason.trim().isEmpty) return;

    final me = ref.read(currentUidProvider);
    final profile = ref.read(matrimonyProfileProvider(uid)).value;
    if (me == null || profile == null) return;

    await ref
        .read(matrimonyRepositoryProvider)
        .report(
          profileId: profile.id,
          profileName: profile.name,
          reporterUid: me,
          reason: reason,
        );

    messenger.showSnackBar(SnackBar(content: Text(strings.reportSent)));
  }
}

class _ProfileBody extends ConsumerWidget {
  const _ProfileBody({required this.profile, required this.strings});

  final MatrimonyProfile profile;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(Gap.page, 0, Gap.page, Gap.xxl),
      children: [
        _PhotoGallery(profile: profile, strings: strings),

        const SizedBox(height: Gap.lg),
        Text(profile.name, style: context.texts.headlineSmall),
        const SizedBox(height: 4),
        Text(
          [
            if (profile.age != null) '${profile.age}',
            profile.heightLabel,
          ].where((part) => part.isNotEmpty).join(' · '),
          style: context.texts.bodyMedium,
        ),
        const SizedBox(height: Gap.sm),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            _Tag(
              label: strings.pick(
                profile.maritalStatus.label,
                profile.maritalStatus.labelTa,
              ),
            ),
            _Tag(
              label: strings.pick(profile.diet.label, profile.diet.labelTa),
            ),
          ],
        ),

        if (profile.about.isNotEmpty) ...[
          const SizedBox(height: Gap.xl),
          _SectionLabel(text: strings.aboutPerson),
          Text(profile.about, style: context.texts.bodyLarge),
        ],

        const SizedBox(height: Gap.xl),
        _ContactBlock(profile: profile, strings: strings),

        const SizedBox(height: Gap.xl),
        _SectionLabel(text: strings.isTamil ? 'விவரங்கள்' : 'Details'),
        _Row(label: strings.education, value: profile.education),
        _Row(label: strings.occupation, value: profile.occupation),
        _Row(label: strings.workLocation, value: profile.workLocation),
        _Row(label: strings.hometown, value: profile.hometown),
        _Row(label: strings.seemay, value: profile.seemay),
        _Row(label: strings.motherTongue, value: profile.motherTongue),
        _Row(
          label: strings.postedBy,
          value: strings.pick(profile.postedBy.label, profile.postedBy.labelTa),
        ),

        if (profile.birthTime.isNotEmpty || profile.birthPlace.isNotEmpty) ...[
          const SizedBox(height: Gap.lg),
          _SectionLabel(text: strings.birthDetails),
          _Row(label: strings.birthTime, value: profile.birthTime),
          _Row(label: strings.birthPlace, value: profile.birthPlace),
        ],

        if (profile.fatherOccupation.isNotEmpty ||
            profile.motherOccupation.isNotEmpty ||
            profile.siblings.isNotEmpty) ...[
          const SizedBox(height: Gap.lg),
          _SectionLabel(text: strings.family),
          _Row(
            label: strings.fatherOccupation,
            value: profile.fatherOccupation,
          ),
          _Row(
            label: strings.motherOccupation,
            value: profile.motherOccupation,
          ),
          _Row(label: strings.siblings, value: profile.siblings),
        ],

        const SizedBox(height: Gap.xl),
        Text(
          '${strings.isTamil ? 'புதுப்பிக்கப்பட்டது' : 'Updated'} '
          '${Dates.relative(profile.updatedAt, strings)}',
          style: context.texts.bodySmall,
        ),
      ],
    );
  }
}

/// The photographs, if this viewer may see any.
///
/// Which set is on screen depends on what has been earned. An unrestricted
/// profile repeats its photos on the public document, so anyone signed in sees
/// them. A restricted one keeps them only in `private/contact`, which the rules
/// release once an interest has been accepted in either direction — so the
/// gallery simply renders whichever list it actually has, and the difference
/// between "no photographs" and "photographs you have not earned" is stated
/// rather than left to look like the same thing.
class _PhotoGallery extends ConsumerStatefulWidget {
  const _PhotoGallery({required this.profile, required this.strings});

  final MatrimonyProfile profile;
  final Strings strings;

  @override
  ConsumerState<_PhotoGallery> createState() => _PhotoGalleryState();
}

class _PhotoGalleryState extends ConsumerState<_PhotoGallery> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final strings = widget.strings;
    final brand = context.brand;

    final me = ref.watch(currentUidProvider);
    final unlocked =
        me == profile.id || ref.watch(matchedUidsProvider).contains(profile.id);

    // Public photos first; the private set only when it is readable at all.
    //
    // Two ways to have earned it now. An accepted interest reads them through
    // the contact document as before; a subscriber on an overriding plan reads
    // the photographs alone, without the phone number that used to sit beside
    // them in the same document.
    final subscription = ref.watch(subscriptionProvider).value;
    final byPlan = subscription?.canSeeRestrictedPhotos ?? false;

    var photos = profile.photos;
    if (photos.isEmpty && unlocked) {
      photos =
          ref.watch(matrimonyContactProvider(profile.id)).value?.photos ??
          const [];
    }
    if (photos.isEmpty && !unlocked && byPlan && profile.hasPhotos) {
      photos =
          ref.watch(restrictedPhotosProvider(profile.id)).value ?? const [];
    }

    if (photos.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 260,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: brand.matrimony.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(Radii.lg),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  profile.name.isEmpty
                      ? '?'
                      : profile.name.characters.first.toUpperCase(),
                  style: context.texts.displaySmall?.copyWith(
                    color: brand.matrimony,
                    fontSize: 56,
                  ),
                ),
                if (profile.hasPhotos) ...[
                  const SizedBox(height: Gap.sm),
                  Icon(
                    Icons.lock_outline,
                    size: 18,
                    color: brand.matrimony.withValues(alpha: 0.75),
                  ),
                ],
              ],
            ),
          ),
          if (profile.hasPhotos) ...[
            const SizedBox(height: Gap.sm),
            _Note(icon: Icons.lock_outline, text: strings.photosOnRequest),
          ],
        ],
      );
    }

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(Radii.lg),
          child: SizedBox(
            height: 340,
            child: Stack(
              children: [
                PageView.builder(
                  controller: _controller,
                  itemCount: photos.length,
                  onPageChanged: (page) => setState(() => _page = page),
                  itemBuilder: (context, index) =>
                      AppImage(url: photos[index].url, fit: BoxFit.cover),
                ),
                if (photos.length > 1)
                  Positioned(
                    right: Gap.md,
                    top: Gap.md,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${_page + 1}/${photos.length}',
                        style: context.texts.labelSmall?.copyWith(
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (photos.length > 1) ...[
          const SizedBox(height: Gap.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var index = 0; index < photos.length; index++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  height: 6,
                  width: index == _page ? 18 : 6,
                  decoration: BoxDecoration(
                    color: index == _page ? brand.matrimony : brand.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Contact details, or the reason they are not shown.
///
/// The lock is real, not a UI convention: the phone number lives in a
/// subcollection whose read rule requires an accepted interest in either
/// direction. If this viewer has not earned it, the number was never sent to
/// the device — there is nothing here to inspect around.
class _ContactBlock extends ConsumerWidget {
  const _ContactBlock({required this.profile, required this.strings});

  final MatrimonyProfile profile;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand = context.brand;
    final me = ref.watch(currentUidProvider);
    final matched = ref.watch(matchedUidsProvider).contains(profile.id);
    final isMine = me == profile.id;

    // A plan can unlock the photographs; it never unlocks the number. The desk
    // does the introduction instead, so a member's phone number is still only
    // ever released by the member — which is the promise the restricted setting
    // made, and the reason this shows a switchboard rather than a shortcut.
    final byPlan =
        ref.watch(subscriptionProvider).value?.canSeeRestrictedPhotos ?? false;
    final desk = ref.watch(appSettingsProvider).value?.contactPhone.trim() ?? '';
    final showDesk = byPlan && desk.isNotEmpty;

    if (!matched && !isMine) {
      return Container(
        padding: const EdgeInsets.all(Gap.lg),
        decoration: BoxDecoration(
          color: brand.muted,
          borderRadius: BorderRadius.circular(Radii.lg),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.lock_outline, size: 20, color: brand.mutedForeground),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    strings.contactDetails,
                    style: context.texts.titleSmall,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    strings.contactLocked,
                    style: context.texts.bodySmall,
                  ),
                  if (showDesk) ...[
                    const SizedBox(height: Gap.md),
                    Text(strings.askTheDesk, style: context.texts.titleSmall),
                    const SizedBox(height: 2),
                    _ContactLine(
                      icon: Icons.call_outlined,
                      value: desk,
                      onTap: () => launchUrl(
                        Uri.parse('tel:$desk'),
                        mode: LaunchMode.externalApplication,
                      ),
                    ),
                    Text(
                      strings.askTheDeskBody,
                      style: context.texts.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
    }

    final contact = ref.watch(matrimonyContactProvider(profile.id));

    return contact.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: Gap.lg),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (value) {
        if (value == null) return const SizedBox.shrink();

        Future<void> launch(String url) async {
          final target = Uri.tryParse(url);
          if (target == null) return;
          await launchUrl(target, mode: LaunchMode.externalApplication);
        }

        return Container(
          padding: const EdgeInsets.all(Gap.lg),
          decoration: BoxDecoration(
            color: brand.matrimony.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(Radii.lg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.lock_open, size: 18, color: brand.matrimony),
                  const SizedBox(width: Gap.sm),
                  Text(
                    strings.contactDetails,
                    style: context.texts.titleSmall,
                  ),
                ],
              ),
              const SizedBox(height: Gap.md),
              if (value.phone.isNotEmpty)
                _ContactLine(
                  icon: Icons.call_outlined,
                  value: value.phone,
                  onTap: () => launch('tel:${value.phone}'),
                ),
              if (value.email.isNotEmpty)
                _ContactLine(
                  icon: Icons.mail_outline,
                  value: value.email,
                  onTap: () => launch('mailto:${value.email}'),
                ),
              if (value.horoscopeNote.isNotEmpty) ...[
                const SizedBox(height: Gap.sm),
                Text(strings.horoscope, style: context.texts.titleSmall),
                const SizedBox(height: 2),
                Text(value.horoscopeNote, style: context.texts.bodyMedium),
              ],

              // The sheet itself, once it has been earned. Tapping opens it
              // full screen — a jathagam is unreadable at thumbnail size.
              if (value.horoscopeImage != null) ...[
                const SizedBox(height: Gap.md),
                GestureDetector(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (context) => _HoroscopeViewer(
                        image: value.horoscopeImage!,
                        title: strings.horoscope,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      AppImage(
                        url: value.horoscopeImage!.url,
                        height: 96,
                        width: 74,
                        borderRadius: BorderRadius.circular(Radii.md),
                      ),
                      const SizedBox(width: Gap.md),
                      Expanded(
                        child: Row(
                          children: [
                            Icon(
                              Icons.auto_stories_outlined,
                              size: 16,
                              color: brand.matrimony,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                strings.viewHoroscope,
                                style: context.texts.labelMedium?.copyWith(
                                  color: brand.matrimony,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

/// The jathagam, full screen and zoomable.
class _HoroscopeViewer extends StatelessWidget {
  const _HoroscopeViewer({required this.image, required this.title});

  final ArticleImage image;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(title),
      ),
      // Handwriting on a printed sheet is the whole point, so it has to be
      // possible to get close to it.
      body: InteractiveViewer(
        minScale: 1,
        maxScale: 5,
        child: Center(child: AppImage(url: image.url, fit: BoxFit.contain)),
      ),
    );
  }
}

class _ContactLine extends StatelessWidget {
  const _ContactLine({
    required this.icon,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Gap.sm),
        child: Row(
          children: [
            Icon(icon, size: 18, color: context.brand.matrimony),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Text(
                value,
                style: context.texts.bodyLarge?.copyWith(
                  color: context.brand.matrimony,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Send, withdraw, or answer — whichever this pairing allows right now.
class _InterestBar extends ConsumerWidget {
  const _InterestBar({required this.profile, required this.strings});

  final MatrimonyProfile profile;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUidProvider);
    if (me == null || me == profile.id) return const SizedBox.shrink();

    final state = ref.watch(interestStateProvider(profile.id));
    final remaining = ref.watch(remainingInterestsProvider);
    final member = ref.watch(memberProvider).value;
    final repository = ref.read(matrimonyRepositoryProvider);
    final brand = context.brand;

    // Inside matrimony somebody is their listing, so the name that travels with
    // an interest is the listing's. It falls back to the account name and then
    // to nothing — never to `shortName`, which would put the sender's phone
    // number in a document the recipient can read.
    final mine = ref.watch(myMatrimonyProfileProvider).value;
    final senderName = mine?.name.trim().isNotEmpty ?? false
        ? mine!.name.trim()
        : (member?.publicName ?? '');

    final outOfInterests = remaining != null && remaining == 0;

    Future<void> send() async {
      final messenger = ScaffoldMessenger.of(context);
      await repository.sendInterest(
        fromUid: me,
        toUid: profile.id,
        fromName: senderName,
        toName: profile.name,
      );
      messenger.showSnackBar(
        SnackBar(content: Text(strings.interestSent)),
      );
    }

    final child = switch (state) {
      InterestState.none => outOfInterests
          ? _Message(
              icon: Icons.info_outline,
              text: '${strings.noInterestsLeft} ${strings.premiumOnWeb}',
            )
          : FilledButton.icon(
              onPressed: send,
              icon: const Icon(Icons.favorite_outline, size: 18),
              label: Text(strings.sendInterest),
            ),
      InterestState.sent => OutlinedButton(
        onPressed: () => repository.withdraw(
          MatrimonyInterest.idFor(me, profile.id),
        ),
        child: Text('${strings.interestSent} · ${strings.withdraw}'),
      ),
      InterestState.awaitingMyAnswer => Row(
        children: [
          Expanded(
            child: FilledButton(
              onPressed: () => repository.respond(
                MatrimonyInterest.idFor(profile.id, me),
                InterestStatus.accepted,
              ),
              child: Text(strings.accept),
            ),
          ),
          const SizedBox(width: Gap.sm),
          Expanded(
            child: OutlinedButton(
              onPressed: () => repository.respond(
                MatrimonyInterest.idFor(profile.id, me),
                InterestStatus.declined,
              ),
              child: Text(strings.decline),
            ),
          ),
        ],
      ),
      InterestState.matched => _Message(
        icon: Icons.favorite,
        text: strings.matchedLabel,
        color: brand.matrimony,
      ),
      InterestState.closed => _Message(
        icon: Icons.do_not_disturb_on_outlined,
        text: strings.declinedLabel,
      ),
    };

    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color: context.scheme.surface,
          border: Border(top: BorderSide(color: brand.border)),
        ),
        padding: const EdgeInsets.all(Gap.md),
        child: SizedBox(width: double.infinity, child: child),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text, this.color});

  final IconData icon;
  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final tone = color ?? context.brand.mutedForeground;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 18, color: tone),
        const SizedBox(width: Gap.sm),
        Flexible(
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: context.texts.labelLarge?.copyWith(color: tone),
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.sm),
      child: Text(
        text.toUpperCase(),
        style: context.texts.labelSmall?.copyWith(
          color: context.brand.mutedForeground,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: Gap.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 118,
            child: Text(label, style: context.texts.bodySmall),
          ),
          Expanded(
            child: Text(value, style: context.texts.bodyLarge),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: context.brand.muted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label, style: context.texts.labelSmall),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: context.brand.mutedForeground),
        const SizedBox(width: Gap.sm),
        Expanded(child: Text(text, style: context.texts.bodySmall)),
      ],
    );
  }
}
