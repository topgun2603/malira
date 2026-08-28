import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'data/models/article.dart';
import 'ui/account/account_page.dart';
import 'ui/account/phone_sign_in_page.dart';
import 'ui/account/sign_in_page.dart';
import 'state/preferences.dart';
import 'ui/events/event_detail_page.dart';
import 'ui/events/events_page.dart';
import 'ui/more/about_page.dart';
import 'ui/more/archive_page.dart';
import 'ui/more/more_page.dart';
import 'ui/news/article_page.dart';
import 'ui/news/feed_page.dart';
import 'ui/news/notifications_page.dart';
import 'ui/news/saved_page.dart';
import 'ui/matrimony/edit_profile_page.dart';
import 'ui/matrimony/matrimony_home_page.dart';
import 'ui/matrimony/profile_detail_page.dart';
import 'ui/news/search_page.dart';
import 'ui/onboarding/onboarding_page.dart';
import 'ui/shell/root_shell.dart';
import 'ui/songs/playlist_page.dart';
import 'ui/songs/songs_page.dart';

final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final routerProvider = Provider<GoRouter>((ref) {
  // Read, not watched: the router is built once, and re-creating it when the
  // flag flips would rebuild the whole navigator underneath the reader as they
  // finish the last screen.
  final onboarded = ref.read(preferencesProvider).onboarded;

  return GoRouter(
    navigatorKey: _rootKey,
    // Matrimony is the front door, matching the web. Opening the app on the
    // centre tab is safe for somebody who has never signed in: the matrimony
    // screen shows its own sign-in gate rather than bouncing to a login, so a
    // first run lands on the pitch instead of on a form.
    initialLocation: onboarded ? '/matrimony' : '/welcome',
    routes: [
      // First run. Outside the shell: there is no tab bar to show somebody who
      // has not yet chosen the language the tabs would be labelled in.
      GoRoute(
        path: '/welcome',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const OnboardingPage(),
      ),

      // The five tabs, each with its own navigator so a story opened from
      // Events and a story opened from News keep separate back stacks.
      //
      // These five paths — /news, /events, /matrimony, /songs, /more — are
      // branch roots and can only be reached with `context.go`. Pushing one
      // builds the shell as a standalone page with no branch selected, which
      // paints nothing and throws nothing: a black screen with no way to
      // diagnose it from the logs. Everything declared *below* the shell is a
      // normal route and can be pushed.
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => RootShell(shell: shell),
        branches: [
          // News and events carry hill blue, songs tea green, matrimony rose —
          // the same three-way split globals.css applies with `[data-section]`.
          // Wrapping at the route means a page never has to know its own
          // accent, exactly as a web component never has to.
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/news',
                builder: (context, state) =>
                    SectionTheme.news(context: context, child: const FeedPage()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/events',
                builder: (context, state) => SectionTheme.news(
                  context: context,
                  child: const EventsPage(),
                ),
              ),
            ],
          ),
          // The centre tab. Matrimony themes itself, because it is also
          // reachable from the drawer and from the account page.
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/matrimony',
                builder: (context, state) => const MatrimonyHomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/songs',
                builder: (context, state) => SectionTheme.songs(
                  context: context,
                  child: const SongsPage(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/more',
                builder: (context, state) => const MorePage(),
              ),
            ],
          ),
        ],
      ),

      // Everything below covers the tab bar. A story is read full-screen; the
      // navigation rail is not part of reading it.
      GoRoute(
        path: '/article/:id',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => SectionTheme.news(
          context: context,
          child: ArticlePage(
            articleId: state.pathParameters['id']!,
          // Passed when the reader tapped a card, so the headline and image are
          // on screen instantly and the fetch only fills in the body.
            preloaded: state.extra is Article ? state.extra as Article : null,
          ),
        ),
      ),
      GoRoute(
        path: '/event/:id',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => SectionTheme.news(
          context: context,
          child: EventDetailPage(eventId: state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/playlist/:id',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => SectionTheme.songs(
          context: context,
          child: PlaylistPage(
            playlistId: state.pathParameters['id']!,
            title: state.uri.queryParameters['title'] ?? '',
          ),
        ),
      ),
      GoRoute(
        path: '/saved',
        parentNavigatorKey: _rootKey,
        builder: (context, state) =>
            SectionTheme.news(context: context, child: const SavedPage()),
      ),
      GoRoute(
        path: '/notifications',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => SectionTheme.news(
          context: context,
          child: const NotificationsPage(),
        ),
      ),
      GoRoute(
        path: '/search',
        parentNavigatorKey: _rootKey,
        builder: (context, state) =>
            SectionTheme.news(context: context, child: const SearchPage()),
      ),
      GoRoute(
        path: '/archive',
        parentNavigatorKey: _rootKey,
        builder: (context, state) =>
            SectionTheme.news(context: context, child: const ArchivePage()),
      ),
      GoRoute(
        path: '/about',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const AboutPage(),
      ),

      // Account. Only matrimony needs one; the newsroom never asks.
      // Phone first: it is the route this readership can complete alone.
      // Email stays reachable underneath it, and is the same account system,
      // so somebody who registered on the web signs in with what they have.
      GoRoute(
        path: '/sign-in',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const PhoneSignInPage(),
      ),
      GoRoute(
        path: '/sign-in/email',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const SignInPage(),
      ),
      GoRoute(
        path: '/account',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const AccountPage(),
      ),

      // `/matrimony/edit` is declared before `/matrimony/:uid` so "edit" is
      // never mistaken for somebody's uid. `/matrimony` itself is a tab root,
      // declared in the shell above.
      GoRoute(
        path: '/matrimony/edit',
        parentNavigatorKey: _rootKey,
        builder: (context, state) => const EditMatrimonyProfilePage(),
      ),
      GoRoute(
        path: '/matrimony/:uid',
        parentNavigatorKey: _rootKey,
        builder: (context, state) =>
            MatrimonyProfilePage(uid: state.pathParameters['uid']!),
      ),
    ],
  );
});
