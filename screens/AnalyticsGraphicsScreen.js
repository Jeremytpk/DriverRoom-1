import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import CustomHeader from '../components/CustomHeader';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(46, 139, 87, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
};

const FILTERS = [
  { key: 'drivers', label: 'Drivers (incl. Trainers)' },
  { key: 'trainers', label: 'Trainers' },
  { key: 'companies', label: 'Companies' },
  { key: 'gateCodes', label: 'Gate Codes' },
  { key: 'totalUsers', label: 'Total Users' },
];
const TIME_RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'selectMonth', label: 'Select Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'selectYear', label: 'Select Year' },
];

const AnalyticsGraphicsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    drivers: 0,
    trainers: 0,
    companies: 0,
    gateCodes: 0,
    totalUsers: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState('drivers');
  const [selectedTime, setSelectedTime] = useState('today');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartData, setChartData] = useState([]);
  const [chartLabels, setChartLabels] = useState([]);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({...doc.data(), createdAt: doc.data().createdAt?.toDate?.() || null }));
        const drivers = users.filter(u => u.role === 'driver' || u.role === 'trainer').length;
        const trainers = users.filter(u => u.role === 'trainer').length;
        // Companies
        const companiesSnap = await getDocs(collection(db, 'companies'));
        const companies = companiesSnap.docs.map(doc => ({...doc.data(), createdAt: doc.data().createdAt?.toDate?.() || null }));
        // Gate Codes
        const gateCodesSnap = await getDocs(collection(db, 'gateCodes'));
        const gateCodes = gateCodesSnap.docs.map(doc => ({...doc.data(), createdAt: doc.data().createdAt?.toDate?.() || null }));
        setStats({
          drivers,
          trainers,
          companies: companies.length,
          gateCodes: gateCodes.length,
          totalUsers: users.length,
        });

        // Time range calculation
        const now = new Date();
        let start, end;
        if (selectedTime === 'today') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        } else if (selectedTime === 'thisMonth') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else if (selectedTime === 'selectMonth') {
          start = new Date(now.getFullYear(), selectedMonth, 1);
          end = new Date(now.getFullYear(), selectedMonth + 1, 1);
        } else if (selectedTime === 'thisYear') {
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
        } else if (selectedTime === 'selectYear') {
          start = new Date(selectedYear, 0, 1);
          end = new Date(selectedYear + 1, 0, 1);
        }

        // Get new count for selected filter
        let items = [];
        if (selectedFilter === 'drivers') {
          items = users.filter(u => (u.role === 'driver' || u.role === 'trainer') && u.createdAt);
        } else if (selectedFilter === 'trainers') {
          items = users.filter(u => u.role === 'trainer' && u.createdAt);
        } else if (selectedFilter === 'companies') {
          items = companies.filter(c => c.createdAt);
        } else if (selectedFilter === 'gateCodes') {
          items = gateCodes.filter(g => g.createdAt);
        } else if (selectedFilter === 'totalUsers') {
          items = users.filter(u => u.createdAt);
        }
        const newItems = items.filter(i => i.createdAt && i.createdAt >= start && i.createdAt < end);
        setNewCount(newItems.length);

        // Simulate time-based data for demo (replace with real aggregation if available)
        let labels = [];
        let data = [];
        if (selectedTime === 'today') {
          labels = ['Today'];
          data = [newItems.length];
        } else if (selectedTime === 'thisMonth' || selectedTime === 'selectMonth') {
          const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
          labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
          data = labels.map((_, i) => items.filter(it => it.createdAt && it.createdAt.getDate() === i + 1 && it.createdAt >= start && it.createdAt < end).length);
        } else if (selectedTime === 'thisYear' || selectedTime === 'selectYear') {
          labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          data = labels.map((_, i) => items.filter(it => it.createdAt && it.createdAt.getMonth() === i && it.createdAt >= start && it.createdAt < end).length);
        }
        setChartLabels(labels);
        setChartData(data);
      } catch (e) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedFilter, selectedTime, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFB' }}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={{ marginTop: 16, fontSize: 18, color: '#2E8B57', fontWeight: '600' }}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
      <CustomHeader navigation={navigation} title="Analytics Graphics" />
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.professionalFilterBox}>
          <Text style={styles.sectionTitle}>Analytics Filters</Text>
          <View style={styles.divider} />
          <Text style={styles.filterLabel}>Select Data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterButton, selectedFilter === f.key && styles.filterButtonActive, styles.elevated]}
                onPress={() => setSelectedFilter(f.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterButtonText, selectedFilter === f.key && styles.filterButtonTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Select Time Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {TIME_RANGES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.filterButton, selectedTime === t.key && styles.filterButtonActive, styles.elevated]}
                onPress={() => {
                  if (t.key === 'selectMonth') setShowMonthPicker(true);
                  else if (t.key === 'selectYear') setShowYearPicker(true);
                  else setSelectedTime(t.key);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterButtonText, selectedTime === t.key && styles.filterButtonTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Month Picker Modal */}
          <Modal visible={showMonthPicker} transparent animationType="fade">
            <View style={styles.pickerModalBg}>
              <View style={styles.pickerModalBox}>
                <Text style={styles.pickerTitle}>Select Month</Text>
                {Array.from({ length: 12 }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.pickerOption, selectedMonth === i && styles.pickerOptionActive]}
                    onPress={() => {
                      setSelectedMonth(i);
                      setSelectedTime('selectMonth');
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selectedMonth === i && styles.pickerOptionTextActive]}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowMonthPicker(false)}>
                  <Text style={{ color: '#888', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {/* Year Picker Modal */}
          <Modal visible={showYearPicker} transparent animationType="fade">
            <View style={styles.pickerModalBg}>
              <View style={styles.pickerModalBox}>
                <Text style={styles.pickerTitle}>Select Year</Text>
                {Array.from({ length: 6 }, (_, i) => selectedYear - 3 + i).map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.pickerOption, selectedYear === y && styles.pickerOptionActive]}
                    onPress={() => {
                      setSelectedYear(y);
                      setSelectedTime('selectYear');
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, selectedYear === y && styles.pickerOptionTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowYearPicker(false)}>
                  <Text style={{ color: '#888', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
        <View style={styles.statsBox}>
          <Text style={styles.chartTitle}>{FILTERS.find(f => f.key === selectedFilter)?.label} ({TIME_RANGES.find(t => t.key === selectedTime)?.label})</Text>
          <Text style={styles.newCountText}>New added: <Text style={styles.newCountHighlight}>{newCount}</Text></Text>
        </View>
        {/* ...existing code for BarChart and chart rendering... */}
        <BarChart
          data={{
            labels: chartLabels,
            datasets: [
              { data: chartData },
            ],
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A3C34',
    marginBottom: 8,
    alignSelf: 'flex-start',
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E4EA',
    marginVertical: 10,
    width: '100%',
  },
  statsBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    alignItems: 'flex-start',
  },
  newCountHighlight: {
    fontWeight: 'bold',
    color: '#1A8B57',
    fontSize: 17,
    letterSpacing: 0.1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E8B57',
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    width: 180,
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#2E8B57',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pickerCancel: {
    marginTop: 12,
    padding: 8,
  },
  professionalFilterBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
    alignItems: 'flex-start',
  },
  filterLabel: {
    fontSize: 15,
    color: '#6A7A8C',
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
    letterSpacing: 0.1,
  },
  newCountText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    marginLeft: 8,
    letterSpacing: 0.1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 10,
    marginLeft: 2,
  },
  filterButton: {
    backgroundColor: '#F0F2F5',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    margin: 4,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E4EA',
    transition: 'background-color 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#1A8B57',
    borderColor: '#1A8B57',
  },
  filterButtonText: {
    color: '#1A8B57',
    fontWeight: '500',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  contentContainer: {
    padding: 18,
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: '#F4F6F8',
    minHeight: '100%',
  },
  chart: {
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A3C34',
    marginTop: 8,
    marginBottom: 2,
    alignSelf: 'flex-start',
    marginLeft: 2,
    letterSpacing: 0.2,
  },
});

export default AnalyticsGraphicsScreen;
