import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/palette.dart';
import '../../state/preferences.dart';
import '../../state/providers.dart';
import '../common/states.dart';
import 'widgets/article_card.dart';

/// Headline search.
///
/// Honest about its reach: Firestore has no text index, so this searches a
/// recent window of published stories on the device rather than the whole
/// archive. That limit is stated on screen instead of being left for a reader
/// to discover when an old story does not turn up.
class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  Timer? _debounce;
  String _term = '';

  @override
  void initState() {
    super.initState();
    // Opening the keyboard immediately: the reader tapped search, they are
    // going to type.
    WidgetsBinding.instance.addPostFrameCallback((_) => _focus.requestFocus());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    // Long enough that a fast typist issues one query rather than eight.
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _term = value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final results = ref.watch(searchResultsProvider(_term));
    final brand = context.brand;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _controller,
          focusNode: _focus,
          onChanged: _onChanged,
          textInputAction: TextInputAction.search,
          style: context.texts.bodyLarge,
          decoration: InputDecoration(
            hintText: strings.searchHint,
            hintStyle: context.texts.bodyMedium,
            border: InputBorder.none,
          ),
        ),
        actions: [
          if (_controller.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () {
                _controller.clear();
                setState(() => _term = '');
              },
            ),
        ],
        shape: Border(bottom: BorderSide(color: brand.border)),
      ),
      body: switch (results) {
        _ when _term.trim().length < 2 => EmptyState(
          icon: Icons.search,
          title: strings.search,
          body: strings.isTamil
              ? 'சமீபத்திய செய்திகளின் தலைப்புகளில் தேடப்படும்.'
              : 'Searches the headlines of recent stories.',
        ),
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
        AsyncError() => ErrorStateView(
          title: strings.offlineTitle,
          body: strings.offlineBody,
          retryLabel: strings.retry,
          onRetry: () => ref.invalidate(searchResultsProvider(_term)),
        ),
        AsyncData(:final value) when value.isEmpty => EmptyState(
          icon: Icons.search_off,
          title: strings.noResults,
          body: strings.isTamil
              ? 'வேறு சொல்லில் முயற்சிக்கவும்.'
              : 'Try a different word.',
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.symmetric(
            horizontal: Gap.page,
            vertical: Gap.lg,
          ),
          itemCount: value.length,
          separatorBuilder: (context, index) => Padding(
            padding: const EdgeInsets.symmetric(vertical: Gap.lg),
            child: Divider(color: brand.border, height: 1),
          ),
          itemBuilder: (context, index) =>
              ArticleCard(article: value[index]),
        ),
      },
    );
  }
}
