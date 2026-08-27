import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/l10n/strings.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/matrimony.dart';
import '../../../state/auth.dart';
import '../../../state/matrimony.dart';
import '../../../state/preferences.dart';
import '../../common/app_image.dart';
import '../../common/states.dart';

/// Interests received and sent.
///
/// Received comes first because it is the half that needs a decision from this
/// member; sent is a record of what they are waiting on.
class InterestsTab extends ConsumerWidget {
  const InterestsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final remaining = ref.watch(remainingInterestsProvider);

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          if (remaining != null) _Quota(remaining: remaining, strings: strings),
          TabBar(
            labelStyle: context.texts.labelMedium,
            dividerColor: context.brand.border,
            tabs: [
              Tab(text: strings.received),
              Tab(text: strings.sentTab),
            ],
          ),
          const Expanded(
            child: TabBarView(
              children: [
                _InterestList(incoming: true),
                _InterestList(incoming: false),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// How many free interests are left this month.
///
/// Shown, never sold. Upgrading is a purchase of a digital service, and Google
/// Play requires those to go through Play Billing — so the app states the limit
/// and points at the website rather than opening a checkout it is not allowed
/// to open. See the README.
class _Quota extends StatelessWidget {
  const _Quota({required this.remaining, required this.strings});

  final int remaining;
  final Strings strings;

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    final exhausted = remaining == 0;
    final tone = exhausted ? brand.saffron : brand.mutedForeground;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(Gap.page, Gap.md, Gap.page, 0),
      padding: const EdgeInsets.all(Gap.md),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(Radii.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            exhausted ? Icons.info_outline : Icons.favorite_outline,
            size: 17,
            color: tone,
          ),
          const SizedBox(width: Gap.sm),
          Expanded(
            child: Text(
              exhausted
                  ? '${strings.noInterestsLeft} ${strings.premiumOnWeb}'
                  : '$remaining ${strings.interestsLeft}',
              style: context.texts.bodySmall?.copyWith(color: tone),
            ),
          ),
        ],
      ),
    );
  }
}

class _InterestList extends ConsumerWidget {
  const _InterestList({required this.incoming});

  final bool incoming;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final uid = ref.watch(currentUidProvider);
    final source = incoming
        ? ref.watch(receivedInterestsProvider)
        : ref.watch(sentInterestsProvider);

    if (uid == null) return const SizedBox.shrink();

    return switch (source) {
      AsyncLoading() => const Center(child: CircularProgressIndicator()),
      AsyncError() => ErrorStateView(
        title: strings.offlineTitle,
        body: strings.offlineBody,
        retryLabel: strings.retry,
        onRetry: () => ref.invalidate(
          incoming ? receivedInterestsProvider : sentInterestsProvider,
        ),
      ),
      AsyncData(:final value) when value.isEmpty => EmptyState(
        icon: Icons.mail_outline,
        title: strings.noInterests,
        body: incoming
            ? (strings.isTamil
                  ? 'உங்கள் தகவலை விரும்புபவர்கள் இங்கே தோன்றுவார்கள்.'
                  : 'People who are interested in your profile appear here.')
            : (strings.isTamil
                  ? 'நீங்கள் அனுப்பிய விருப்பங்கள் இங்கே தோன்றும்.'
                  : 'Interests you send appear here.'),
      ),
      AsyncData(:final value) => ListView.builder(
        padding: const EdgeInsets.fromLTRB(
          Gap.page,
          Gap.md,
          Gap.page,
          Gap.xxl,
        ),
        // Newest first. The stream has no order clause, because a single
        // equality filter needs no composite index and sorting a handful of
        // rows here costs nothing.
        itemCount: value.length,
        itemBuilder: (context, index) {
          final sorted = [...value]
            ..sort(
              (a, b) => (b.createdAt ?? DateTime(0)).compareTo(
                a.createdAt ?? DateTime(0),
              ),
            );
          return Padding(
            padding: const EdgeInsets.only(bottom: Gap.md),
            child: _InterestTile(
              interest: sorted[index],
              uid: uid,
              incoming: incoming,
              strings: strings,
            ),
          );
        },
      ),
    };
  }
}

class _InterestTile extends ConsumerWidget {
  const _InterestTile({
    required this.interest,
    required this.uid,
    required this.incoming,
    required this.strings,
  });

  final MatrimonyInterest interest;
  final String uid;
  final bool incoming;
  final Strings strings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brand = context.brand;
    final repository = ref.read(matrimonyRepositoryProvider);
    final otherUid = interest.otherUid(uid);
    final name = interest.otherName(uid);

    // The other party's listing, for their photograph. An interest carries only
    // a name, and a column of identical lettered circles gives somebody no way
    // to tell one waiting reply from another.
    final profile = ref.watch(matrimonyProfileProvider(otherUid)).value;
    final photo = (profile?.photos.isNotEmpty ?? false)
        ? profile!.photos.first
        : null;

    final waiting = interest.status == InterestStatus.sent;
    final accepted = interest.status == InterestStatus.accepted;

    return Container(
      decoration: BoxDecoration(
        color: context.scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: brand.border),
      ),
      padding: const EdgeInsets.all(Gap.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => context.push('/matrimony/$otherUid'),
            child: Row(
              children: [
                if (photo != null)
                  ClipOval(
                    child: AppImage(url: photo.url, height: 46, width: 46),
                  )
                else
                  Container(
                    height: 46,
                    width: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: brand.matrimony.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      name.isEmpty ? '?' : name.characters.first.toUpperCase(),
                      style: context.texts.titleMedium?.copyWith(
                        color: brand.matrimony,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                const SizedBox(width: Gap.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isEmpty ? otherUid : name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.texts.titleMedium,
                      ),
                      Text(
                        [
                          _statusLabel(strings, interest.status, incoming),
                          Dates.relative(interest.createdAt, strings),
                        ].where((part) => part.isNotEmpty).join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.texts.bodySmall,
                      ),
                      // A little of who they are, so a decision does not rest
                      // on a name alone.
                      if (profile != null)
                        Text(
                          [
                            if (profile.age != null) '${profile.age}',
                            profile.hometown,
                            profile.occupation,
                          ].where((part) => part.isNotEmpty).join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.texts.bodySmall,
                        ),
                    ],
                  ),
                ),
                if (accepted)
                  Icon(Icons.favorite, size: 18, color: brand.matrimony),
              ],
            ),
          ),

          // Only the recipient of an unanswered interest gets a decision, and
          // only the sender may withdraw. The rules enforce the same split, so
          // no button here can produce a permission error.
          if (incoming && waiting) ...[
            const SizedBox(height: Gap.md),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: () => repository.respond(
                      interest.id,
                      InterestStatus.accepted,
                    ),
                    child: Text(strings.accept),
                  ),
                ),
                const SizedBox(width: Gap.sm),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => repository.respond(
                      interest.id,
                      InterestStatus.declined,
                    ),
                    child: Text(strings.decline),
                  ),
                ),
              ],
            ),
          ],
          if (!incoming && waiting) ...[
            const SizedBox(height: Gap.sm),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () => repository.withdraw(interest.id),
                child: Text(strings.withdraw),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _statusLabel(
    Strings strings,
    InterestStatus status,
    bool incoming,
  ) {
    return switch (status) {
      InterestStatus.sent =>
        incoming ? strings.awaitingYourAnswer : strings.interestSent,
      InterestStatus.accepted => strings.matchedLabel,
      InterestStatus.declined => strings.declinedLabel,
      InterestStatus.withdrawn => strings.withdrawnLabel,
    };
  }
}
