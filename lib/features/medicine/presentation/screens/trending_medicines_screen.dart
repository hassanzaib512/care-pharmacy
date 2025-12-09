import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/models/medicine.dart';
import '../../../../core/providers/cart_provider.dart';
import '../../../../core/widgets/cart_bubble_fab.dart';
import '../../../../core/widgets/medicine_card.dart';
import '../../../home/presentation/screens/medicine_detail_screen.dart';
import '../../../cart/presentation/screens/cart_screen.dart';

class TrendingMedicinesScreen extends StatelessWidget {
  final List<Medicine> medicines;
  final String title;

  const TrendingMedicinesScreen({
    super.key,
    required this.medicines,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: GridView.builder(
            itemCount: medicines.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.78,
            ),
            itemBuilder: (context, index) {
              final medicine = medicines[index];
              return MedicineCard(
                medicine: medicine,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => MedicineDetailScreen(medicine: medicine),
                    ),
                  );
                },
                onAction: () {},
              );
            },
          ),
        ),
      ),
      floatingActionButton: CartBubbleFab(
        itemCount: cart.totalItems,
        bottomInset: cart.bottomInset,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const CartScreen()),
          );
        },
      ),
    );
  }
}
