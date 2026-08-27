import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../data/models/engagement.dart';
import '../../../state/bookmarks.dart';
import '../../../state/preferences.dart';
import '../../../state/providers.dart';

/// The community poll.
///
/// Before voting: the options as buttons. After voting, or once the poll has
/// closed: the results as bars, with the reader's own choice marked. Voting
/// needs no account — see the rule in `firestore.rules`, which is deliberately
/// open and tightly bounded rather than gated behind sign-in.
class PollCard extends ConsumerWidget {
  const PollCard({super.key, required this.surface});

  final String surface;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final poll = ref.watch(activePollProvider(surface)).value;
    if (poll == null || poll.options.isEmpty) return const SizedBox.shrink();

    final strings = ref.watch(stringsProvider);
    final votedOption = ref.watch(
      votedPollsProvider.select((votes) => votes[poll.id]),
    );
    final showResults = votedOption != null || !poll.isOpen;
    final brand = context.brand;

    Future<void> vote(PollOption option) async {
      // Recorded locally first so the bars appear immediately. If the write
      // fails the reader has still had their say on this device; a poll is not
      // worth an error dialog, and the server-side count is the one that
      // matters for the result the desk reads.
      await ref.read(votedPollsProvider.notifier).record(poll.id, option.id);
      try {
        await ref
            .read(engagementRepositoryProvider)
            .castVote(pollId: poll.id, optionId: option.id);
      } finally {
        ref.invalidate(activePollProvider(surface));
      }
    }

    return Container(
      margin: const EdgeInsets.fromLTRB(Gap.page, Gap.xl, Gap.page, 0),
      padding: const EdgeInsets.all(Gap.lg),
      decoration: BoxDecoration(
        color: context.scheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(Radii.xl),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.how_to_vote_outlined, size: 18, color: brand.saffron),
              const SizedBox(width: Gap.sm),
              Text(
                strings.poll.toUpperCase(),
                style: context.texts.labelSmall?.copyWith(
                  color: context.scheme.onTertiaryContainer,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: Gap.md),
          Text(
            strings.pick(poll.question, poll.questionTa),
            style: context.texts.titleLarge?.copyWith(
              color: context.scheme.onTertiaryContainer,
            ),
          ),
          const SizedBox(height: Gap.lg),

          for (final option in poll.options) ...[
            if (showResults)
              _ResultBar(
                label: strings.pick(option.label, option.labelTa),
                share: poll.shareFor(option.id),
                votes: poll.votesFor(option.id),
                isOwnChoice: votedOption == option.id,
                votesWord: strings.votes,
              )
            else
              _OptionButton(
                label: strings.pick(option.label, option.labelTa),
                onTap: () => vote(option),
              ),
            const SizedBox(height: Gap.sm),
          ],

          const SizedBox(height: Gap.xs),
          Text(
            showResults
                ? '${poll.totalVotes} ${strings.votes}'
                    '${poll.isOpen ? '' : ' · ${strings.pollClosed}'}'
                : '${poll.totalVotes} ${strings.votes}',
            style: context.texts.bodySmall?.copyWith(
              color: context.scheme.onTertiaryContainer.withValues(alpha: 0.75),
            ),
          ),
        ],
      ),
    );
  }
}

class _OptionButton extends StatelessWidget {
  const _OptionButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          alignment: Alignment.centerLeft,
          foregroundColor: context.scheme.onTertiaryContainer,
          side: BorderSide(
            color: context.scheme.onTertiaryContainer.withValues(alpha: 0.3),
          ),
          backgroundColor: context.scheme.surfaceContainerLow.withValues(
            alpha: 0.5,
          ),
        ),
        child: Text(label, textAlign: TextAlign.left),
      ),
    );
  }
}

class _ResultBar extends StatelessWidget {
  const _ResultBar({
    required this.label,
    required this.share,
    required this.votes,
    required this.isOwnChoice,
    required this.votesWord,
  });

  final String label;
  final double share;
  final int votes;
  final bool isOwnChoice;
  final String votesWord;

  @override
  Widget build(BuildContext context) {
    final scheme = context.scheme;
    final brand = context.brand;
    final percent = (share * 100).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            if (isOwnChoice) ...[
              Icon(Icons.check_circle, size: 15, color: brand.saffron),
              const SizedBox(width: 5),
            ],
            Expanded(
              child: Text(
                label,
                style: context.texts.labelMedium?.copyWith(
                  color: scheme.onTertiaryContainer,
                  fontWeight: isOwnChoice ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
            Text(
              '$percent%',
              style: context.texts.labelMedium?.copyWith(
                color: scheme.onTertiaryContainer,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: share),
            duration: const Duration(milliseconds: 550),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) => LinearProgressIndicator(
              value: value,
              minHeight: 7,
              backgroundColor: scheme.onTertiaryContainer.withValues(
                alpha: 0.14,
              ),
              valueColor: AlwaysStoppedAnimation(
                isOwnChoice ? brand.saffron : scheme.primary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 3),
        Text(
          '$votes $votesWord',
          style: context.texts.bodySmall?.copyWith(
            color: scheme.onTertiaryContainer.withValues(alpha: 0.7),
          ),
        ),
      ],
    );
  }
}
