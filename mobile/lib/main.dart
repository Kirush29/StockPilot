import 'package:flutter/material.dart';
import 'sales/screens/record_pos_sale_screen.dart';
import 'sales/screens/demand_alerts_screen.dart';

void main() {
  runApp(const StockPilotMobileApp());
}

class StockPilotMobileApp extends StatelessWidget {
  const StockPilotMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StockPilot Operational',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        primaryColor: const Color(0xFF6366F1),
        scaffoldBackgroundColor: const Color(0xFF020617),
      ),
      home: const MobileDashboardScreen(),
    );
  }
}

class MobileDashboardScreen extends StatefulWidget {
  const MobileDashboardScreen({super.key});

  @override
  State<MobileDashboardScreen> createState() => _MobileDashboardScreenState();
}

class _MobileDashboardScreenState extends State<MobileDashboardScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    RecordPosSaleScreen(),
    DemandAlertsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        backgroundColor: const Color(0xFF0F172A),
        selectedItemColor: const Color(0xFF818CF8),
        unselectedItemColor: Colors.grey,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.point_of_sale),
            label: 'POS Sale',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.trending_up),
            label: 'Demand Alerts',
          ),
        ],
      ),
    );
  }
}
