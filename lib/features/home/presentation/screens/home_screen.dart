import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/models/medicine.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/providers/medicine_provider.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/cart_bubble_fab.dart';
import '../../../../core/widgets/medicine_card.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../common/presentation/widgets/app_drawer.dart';
import '../../../medicine/presentation/screens/all_medicines_screen.dart';
import '../../../medicine/presentation/screens/trending_medicines_screen.dart';
import '../../../cart/presentation/screens/cart_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Season _season;
  double _opacity = 0;
  String _searchQuery = '';
  String _selectedCategory = 'All';
  String _selectedComposition = 'All compositions';
  late final TextEditingController _searchController;
  final List<String> _compositionOptions = const [
    'All compositions',
    'Paracetamol',
    'Ibuprofen',
    'Amoxicillin',
    'Cetirizine',
    'Vitamin C',
    'Zinc',
    'Menthol',
  ];

  @override
  void initState() {
    super.initState();
    _season = _getCurrentSeason();
    _searchController = TextEditingController(text: _searchQuery);
    // Capture providers synchronously to avoid using context after async gaps
    final auth = context.read<AuthProvider>();
    final medProv = context.read<MedicineProvider>();
    final cart = context.read<CartProvider>();
    Future.delayed(const Duration(milliseconds: 120), () {
      if (mounted) {
        setState(() => _opacity = 1);
      }
    });
    Future.microtask(() {
      medProv.updateToken(auth.token);
      medProv.loadAll().then((_) {
        // Guard against disposed widget after async loads
        if (!mounted) return;
        cart.hydrateFromMedicines([
          ...medProv.all,
          ...medProv.trending,
          ...medProv.popular,
        ]);
      });
      medProv.loadTrending();
      medProv.loadPopular();
      medProv.loadSeason().then((_) {
        // Update seasonal banner only when still mounted
        if (!mounted) return;
        if (medProv.remoteSeason != null) {
          setState(() => _season = medProv.remoteSeason!);
        }
      });
    });
  }

  Future<void> _refresh() async {
    final auth = context.read<AuthProvider>();
    final medProv = context.read<MedicineProvider>();
    final cart = context.read<CartProvider>();

    medProv.updateToken(auth.token);
    await medProv.loadAll();
    await Future.wait([
      medProv.loadTrending(),
      medProv.loadPopular(),
      medProv.loadSeason(),
    ]);
    cart.hydrateFromMedicines([
      ...medProv.all,
      ...medProv.trending,
      ...medProv.popular,
    ]);
    if (mounted && medProv.remoteSeason != null) {
      setState(() => _season = medProv.remoteSeason!);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final cart = context.watch<CartProvider>();
    final medProv = context.watch<MedicineProvider>();

    final categories = (medProv.all.map((e) => e.category).toSet().toList()
      ..sort());

    final seasonalMedicines = _filterMedicines(
      medProv.all.where((m) {
        if (m.seasons.contains(_season)) return true;
        // fallback tag/category heuristics
        switch (_season) {
          case Season.winter:
            return m.isTrending || m.category.toLowerCase().contains('cold');
          case Season.summer:
            return m.category.toLowerCase().contains('hydration') ||
                m.category.toLowerCase().contains('skin');
          default:
            return m.isTrending;
        }
      }).toList(),
    );

    final trending = medProv.trending;
    final allFiltered = _filterMedicines(medProv.all);

    final allPreview = allFiltered.take(10).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Care Pharmacy')),
      drawer: const AppDrawer(currentRoute: AppRoutes.home),
      body: Stack(
        children: [
          AnimatedOpacity(
            opacity: _opacity,
            duration: const Duration(milliseconds: 400),
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  _buildHeaderCard(auth.currentUser?.name ?? 'Guest', categories),
                  const SizedBox(height: 16),

                  // ---------------- All medicines ----------------
                  SectionHeader(
                    title: 'All medicines',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => AllMedicinesScreen(
                            medicines: allFiltered,
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 240,
                    child: allPreview.isEmpty
                        ? const Center(child: Text('No medicines available.'))
                        : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: EdgeInsets.zero, // no extra space
                      itemCount: allPreview.length,
                      separatorBuilder: (_, _) =>
                      const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final med = allPreview[index];
                        return MedicineCard(
                          medicine: med,
                          onTap: () => _openMedicine(med),
                          onAction: () {},
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ---------------- Search results ----------------
                  if (_searchQuery.trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      'Results for "$_searchQuery"',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    _MedicineScroller(
                      medicines: allFiltered,
                      onOpen: _openMedicine,
                    ),
                    const SizedBox(height: 22),
                  ],

                  const SizedBox(height: 18),
                  _SeasonHero(season: _season),
                  const SizedBox(height: 22),

                  // ---------------- Trending this season ----------------
                  SectionHeader(
                    title: 'Trending this season',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => TrendingMedicinesScreen(
                            medicines: seasonalMedicines,
                            title: 'Trending this season',
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  _MedicineScroller(
                    medicines: seasonalMedicines,
                    onOpen: _openMedicine,
                  ),

                  const SizedBox(height: 18),

                  // ---------------- Popular picks ----------------
                  SectionHeader(
                    title: 'Popular picks',
                    onAction: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => TrendingMedicinesScreen(
                            medicines: trending,
                            title: 'Popular picks',
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  _MedicineScroller(
                    medicines: trending,
                    onOpen: _openMedicine,
                  ),

                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: cart.totalItems >= 0
          ? CartBubbleFab(
        itemCount: cart.totalItems,
        bottomInset: cart.bottomInset,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const CartScreen(),
            ),
          );
        },
      )
          : null,
    );
  }

  Widget _buildGreeting(String email) {
    final name = email.contains('@') ? email.split('@').first : email;
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 4, 0, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Hi, $name',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Let\'s keep you healthy. Explore curated medicines for you.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }

  void _openMedicine(Medicine medicine) {
    Navigator.pushNamed(
      context,
      AppRoutes.medicineDetail,
      arguments: MedicineDetailArgs(medicine: medicine),
    );
  }

  List<Medicine> _filterMedicines(List<Medicine> meds) {
    final query = _searchQuery.toLowerCase();
    final selected = _selectedCategory.toLowerCase();
    final composition = _selectedComposition.toLowerCase();
    return meds.where((m) {
      final matchesCategory =
      selected == 'all' ? true : m.category.toLowerCase() == selected;
      final matchesComposition = composition == 'all compositions'
          ? true
          : m.ingredients.any((ing) => ing.toLowerCase().contains(composition));
      if (query.isEmpty) return matchesCategory && matchesComposition;
      final matchesQuery = m.name.toLowerCase().contains(query) ||
          (m.manufacturer ?? '').toLowerCase().contains(query);
      return matchesQuery && matchesCategory && matchesComposition;
    }).toList();
  }

  Season _getCurrentSeason() {
    final month = DateTime.now().month;
    if (month >= 3 && month <= 5) return Season.spring;
    if (month >= 6 && month <= 8) return Season.summer;
    if (month >= 9 && month <= 11) return Season.autumn;
    return Season.winter;
  }

  Widget _buildHeaderCard(String nameRaw, List<String> categories) {
    final name = nameRaw.isEmpty
        ? 'Guest'
        : nameRaw[0].toUpperCase() + nameRaw.substring(1);
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGreeting(name),
            const SizedBox(height: 14),
            _SearchField(
              controller: _searchController,
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _LabeledDropdown(
                    label: 'Category',
                    child: _CategoryFilterDropdown(
                      categories: ['All', ...categories],
                      selected: _selectedCategory,
                      onChanged: (value) {
                        setState(() => _selectedCategory = value ?? 'All');
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _LabeledDropdown(
                    label: 'Composition',
                    child: _CompositionDropdown(
                      options: _compositionOptions,
                      selected: _selectedComposition,
                      onChanged: (value) {
                        setState(() =>
                        _selectedComposition = value ?? 'All compositions');
                      },
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MedicineScroller extends StatelessWidget {
  final List<Medicine> medicines;
  final void Function(Medicine) onOpen;

  const _MedicineScroller({
    required this.medicines,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    if (medicines.isEmpty) {
      return const SizedBox(
        height: 220,
        child: Center(child: Text('No medicines available right now.')),
      );
    }

    return SizedBox(
      height: 240,
      child: ListView.separated(
        padding: EdgeInsets.zero, // match outer ListView padding
        scrollDirection: Axis.horizontal,
        itemCount: medicines.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final med = medicines[index];
          return MedicineCard(
            medicine: med,
            onTap: () => onOpen(med),
            onAction: () {},
          );
        },
      ),
    );
  }
}

class _CategoryFilterDropdown extends StatelessWidget {
  final List<String> categories;
  final String? selected;
  final ValueChanged<String?> onChanged;

  const _CategoryFilterDropdown({
    required this.categories,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      'All',
      ...categories.where((c) => c.toLowerCase() != 'all'),
    ];
    final value =
    (selected != null && items.contains(selected)) ? selected : 'All';
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        isDense: true,
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      items: items
          .map(
            (cat) => DropdownMenuItem(
          value: cat,
          child: Text(
            cat,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      )
          .toList(),
      onChanged: onChanged,
    );
  }
}

class _LabeledDropdown extends StatelessWidget {
  final String label;
  final Widget child;

  const _LabeledDropdown({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        child,
      ],
    );
  }
}

class _CompositionDropdown extends StatelessWidget {
  final List<String> options;
  final String selected;
  final ValueChanged<String?> onChanged;

  const _CompositionDropdown({
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: selected,
      isExpanded: true,
      decoration: InputDecoration(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        isDense: true,
        contentPadding:
        const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      items: options
          .map(
            (opt) => DropdownMenuItem(
          value: opt,
          child: Text(
            opt,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      )
          .toList(),
      onChanged: onChanged,
    );
  }
}

class _SeasonHero extends StatelessWidget {
  final Season season;

  const _SeasonHero({required this.season});

  String get _label {
    switch (season) {
      case Season.winter:
        return 'Winter wellness';
      case Season.spring:
        return 'Spring bloom care';
      case Season.summer:
        return 'Summer hydration';
      case Season.autumn:
        return 'Autumn immunity';
    }
  }

  String get _subtitle {
    switch (season) {
      case Season.winter:
        return 'Stay ahead of colds with soothing care.';
      case Season.spring:
        return 'Soothe allergies and embrace fresh starts.';
      case Season.summer:
        return 'Hydrate and protect your skin in the heat.';
      case Season.autumn:
        return 'Boost immunity as the weather cools down.';
    }
  }

  List<Color> get _gradientColors {
    switch (season) {
      case Season.spring:
        return const [Color(0xFFFFA2C4), Color(0xFFFF6FA0)]; // pink
      case Season.summer:
        return const [Color(0xFFFFD54F), Color(0xFFFFA726)]; // yellow/orange
      case Season.autumn:
        return const [Color(0xFFB26A1C), Color(0xFFD98E48)]; // brownish
      case Season.winter:
        return const [Color(0xFF2F70D3), Color(0xFF5BA9FF)]; // blue
    }
  }

  Color get _iconBg {
    switch (season) {
      case Season.spring:
        return const Color(0xFFFFE2ED);
      case Season.summer:
        return const Color(0xFFFFF3C2);
      case Season.autumn:
        return const Color(0xFFF1D9B5);
      case Season.winter:
        return Colors.white.withValues(alpha: 0.2);
    }
  }

  IconData get _icon {
    switch (season) {
      case Season.spring:
        return Icons.local_florist;
      case Season.summer:
        return Icons.wb_sunny_outlined;
      case Season.autumn:
        return Icons.eco_outlined;
      case Season.winter:
        return Icons.ac_unit_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.95, end: 1),
      duration: const Duration(milliseconds: 450),
      builder: (context, value, child) {
        return Transform.scale(scale: value, child: child);
      },
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: _gradientColors,
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          boxShadow: [
            BoxShadow(
              color: _gradientColors.last.withValues(alpha: 0.25),
              blurRadius: 20,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _label,
                    style: Theme.of(
                      context,
                    ).textTheme.titleLarge?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _subtitle,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Trending care picks',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _iconBg,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(
                _icon,
                color: Colors.black.withValues(alpha: 0.65),
                size: 38,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MedicineDetailArgs {
  final Medicine medicine;

  const MedicineDetailArgs({required this.medicine});
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;

  const _SearchField({
    required this.controller,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Icon(
            Icons.search,
            size: 20,
            color: theme.hintColor,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              decoration: const InputDecoration(
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                hintText: 'Search medicine',
              ),
              style: theme.textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
