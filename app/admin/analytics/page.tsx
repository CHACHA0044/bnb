"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, TrendingUp, Users, ShoppingCart, Wallet, Calendar, 
  Loader2, ArrowUpRight, ArrowDownRight, Clock, Star, Zap,
  TrendingDown, Info, LayoutDashboard, Coffee, Layers
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { useAdmin } from "../AdminContext";
import { adminFetchAnalyticsData } from "@/lib/api";
import CustomDatePicker from "@/components/admin/CustomDatePicker";

export default function AnalyticsPage() {
  const { secret, authenticated } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("2025-01-01");
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>(null);

  const loadAnalytics = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const result = await adminFetchAnalyticsData(fromDate, toDate, secret);
      setData(result);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, secret]);

  useEffect(() => {
    if (authenticated) loadAnalytics();
  }, [authenticated, loadAnalytics]);

  // Handle Resize for ECharts when sidebar toggles
  const chartRefs = useRef<any[]>([]);
  useEffect(() => {
    const handleResize = () => {
      chartRefs.current.forEach(chart => {
        if (chart) chart.getEchartsInstance().resize();
      });
    };
    window.addEventListener('resize', handleResize);
    // Also trigger on a small delay to catch sidebar animation
    const timer = setInterval(handleResize, 500);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timer);
    };
  }, []);

  // --- ECharts Options ---

  const revenueTimelineOption = useMemo(() => {
    if (!data?.dailyRevenue) return {};
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        padding: 16,
        textStyle: { color: '#3A241C', fontWeight: 'bold', fontSize: 13 },
        borderWidth: 1,
        borderColor: '#3A241C08',
        shadowBlur: 20,
        shadowColor: 'rgba(0,0,0,0.05)',
        formatter: (params: any) => {
          let res = `<div style="font-size:11px;color:#999;margin-bottom:8px;font-weight:900;text-transform:uppercase;letter-spacing:1px">${params[0].name}</div>`;
          params.forEach((p: any) => {
            res += `<div style="display:flex;justify-content:space-between;gap:30px;margin-bottom:4px">
              <span style="display:flex;items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-top:4px"></span>
                ${p.seriesName}
              </span>
              <span style="font-weight:900">₹${p.value.toLocaleString()}</span>
            </div>`;
          });
          const total = params.reduce((s: any, p: any) => s + p.value, 0);
          res += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;display:flex;justify-content:space-between">
            <span style="font-weight:bold;color:#3A241C">Total</span>
            <span style="font-weight:900;color:#E76F51">₹${total.toLocaleString()}</span>
          </div>`;
          return res;
        }
      },
      legend: {
        data: ['UPI', 'Cash'],
        bottom: 0,
        itemGap: 30,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#3A241C80', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' }
      },
      grid: { left: '4%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.dailyRevenue.map((d: any) => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        }),
        axisLine: { lineStyle: { color: '#3A241C10' } },
        axisLabel: { color: '#3A241C40', fontWeight: 'bold', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#3A241C05', type: 'dashed' } },
        axisLabel: { color: '#3A241C40', fontWeight: 'bold', fontSize: 10 }
      },
      series: [
        {
          name: 'UPI',
          type: 'line',
          smooth: 0.4,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#6A994E20' }, { offset: 1, color: '#6A994E00' }]
            }
          },
          lineStyle: { width: 4, color: '#6A994E' },
          itemStyle: { color: '#6A994E', borderWidth: 2, borderColor: '#fff' },
          symbolSize: 8,
          data: data.dailyRevenue.map((d: any) => d.upi)
        },
        {
          name: 'Cash',
          type: 'line',
          smooth: 0.4,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#E76F5120' }, { offset: 1, color: '#E76F5100' }]
            }
          },
          lineStyle: { width: 4, color: '#E76F51' },
          itemStyle: { color: '#E76F51', borderWidth: 2, borderColor: '#fff' },
          symbolSize: 8,
          data: data.dailyRevenue.map((d: any) => d.cash)
        }
      ]
    };
  }, [data]);

  const hourlyPatternOption = useMemo(() => {
    if (!data?.hourlyPattern) return {};
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#3A241C',
        borderRadius: 12,
        padding: 10,
        textStyle: { color: '#fff', fontWeight: 'bold' },
        formatter: (params: any) => {
          const hour = params[0].name;
          const val = params[0].value;
          return `<div style="text-align:center">
            <div style="font-size:10px;opacity:0.6;margin-bottom:2px">${hour}</div>
            <div style="font-size:14px">${val} Orders</div>
          </div>`;
        }
      },
      grid: { left: '0%', right: '0%', bottom: '0%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.hourlyPattern.map((h: any) => h.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#3A241C40', fontWeight: 'black', fontSize: 9, rotate: 45 }
      },
      yAxis: { show: false },
      series: [{
        type: 'bar',
        data: data.hourlyPattern.map((h: any) => h.orderCount),
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params: any) => {
            const max = Math.max(...data.hourlyPattern.map((h: any) => h.orderCount));
            return params.value === max ? '#E76F51' : '#3A241C10';
          }
        },
        barWidth: '70%'
      }]
    };
  }, [data]);

  const topItemsOption = useMemo(() => {
    if (!data?.topItems) return {};
    const reversed = [...data.topItems].reverse();
    return {
      grid: { left: '5%', right: '15%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: reversed.map((i: any) => i.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#3A241C', fontWeight: 'bold', fontSize: 11 }
      },
      series: [{
        type: 'bar',
        data: reversed.map((i: any) => i.quantity),
        itemStyle: {
          borderRadius: [0, 10, 10, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#3A241C' }, { offset: 1, color: '#5C3A2D' }]
          }
        },
        label: {
          show: true,
          position: 'right',
          color: '#3A241C',
          fontWeight: 'black',
          fontSize: 12,
          formatter: '{c}'
        },
        barWidth: 24
      }]
    };
  }, [data]);

  const weekdayHabitsOption = useMemo(() => {
    if (!data?.weekdayPattern) return {};
    return {
      tooltip: { trigger: 'axis' },
      radar: {
        indicator: data.weekdayPattern.map((d: any) => ({ name: d.day, max: Math.max(...data.weekdayPattern.map((x: any) => x.revenue)) * 1.1 })),
        shape: 'circle',
        splitNumber: 4,
        axisName: { color: '#3A241C60', fontWeight: 'bold', fontSize: 10 },
        splitLine: { lineStyle: { color: '#3A241C08' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#3A241C08' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: data.weekdayPattern.map((d: any) => d.revenue),
          name: 'Daily Revenue',
          itemStyle: { color: '#E76F51' },
          areaStyle: { color: '#E76F5120' },
          lineStyle: { width: 3 }
        }]
      }]
    };
  }, [data]);

  const tablePerformanceOption = useMemo(() => {
    if (!data?.tablePerformance) return {};
    const topTables = data.tablePerformance.slice(0, 8);
    return {
      grid: { left: '3%', right: '3%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: topTables.map((t: any) => t.tableId),
        axisLine: { show: false },
        axisLabel: { color: '#3A241C60', fontWeight: 'black', fontSize: 10 }
      },
      yAxis: { show: false },
      series: [{
        type: 'bar',
        data: topTables.map((t: any) => t.revenue),
        itemStyle: {
          borderRadius: 8,
          color: '#F4A261'
        },
        label: {
          show: true,
          position: 'top',
          color: '#3A241C',
          fontWeight: 'black',
          fontSize: 10,
          formatter: '₹{c}'
        }
      }]
    };
  }, [data]);

  const paymentDonutOption = useMemo(() => {
    if (!data?.summary) return {};
    const { upiRevenue, cashRevenue } = data.summary;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: ₹{c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['65%', '90%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 12, borderColor: '#fff', borderWidth: 4 },
        label: { show: false },
        emphasis: { label: { show: false } },
        data: [
          { value: upiRevenue, name: 'UPI', itemStyle: { color: '#6A994E' } },
          { value: cashRevenue, name: 'Cash', itemStyle: { color: '#F4A261' } }
        ]
      }]
    };
  }, [data]);

  if (!authenticated) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-[#3A241C]/5">
        <div className="flex items-center gap-4">
          <CustomDatePicker 
            mode="range"
            fromDate={fromDate}
            toDate={toDate}
            onRangeChange={(from, to) => {
              if (from) setFromDate(from);
              if (to) setToDate(to);
            }}
            label="Analysis Period"
          />
        </div>
        <div className="flex gap-2">
          {['7D', '30D', 'ALL'].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                const end = new Date().toISOString().split('T')[0];
                let start = "2024-01-01";
                if (preset === '7D') {
                  const d = new Date(); d.setDate(d.getDate() - 7);
                  start = d.toISOString().split('T')[0];
                } else if (preset === '30D') {
                  const d = new Date(); d.setDate(d.getDate() - 30);
                  start = d.toISOString().split('T')[0];
                }
                setFromDate(start);
                setToDate(end);
              }}
              className="px-6 py-3 rounded-2xl bg-[#F9F7F4] text-[#3A241C] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#3A241C] hover:text-white transition-all shadow-sm active:scale-95"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Period Revenue" 
          value={loading ? "---" : `₹${data?.summary?.totalRevenue?.toLocaleString() || 0}`} 
          sub={`Avg ₹${data?.summary?.avgOrderValue || 0} / Order`}
          icon={TrendingUp}
          color="#E76F51"
          loading={loading}
        />
        <StatCard 
          label="Total Orders" 
          value={loading ? "---" : (data?.summary?.totalOrders || 0)} 
          sub={`${data?.summary?.totalItems || 0} Items Prepared`}
          icon={ShoppingCart}
          color="#3A241C"
          loading={loading}
        />
        <StatCard 
          label="UPI Collection" 
          value={loading ? "---" : `₹${data?.summary?.upiRevenue?.toLocaleString() || 0}`} 
          sub={`${Math.round((data?.summary?.upiRevenue / data?.summary?.totalRevenue) * 100) || 0}% Share`}
          icon={Wallet}
          color="#6A994E"
          loading={loading}
        />
        <StatCard 
          label="Dine-in Revenue" 
          value={loading ? "---" : `₹${data?.summary?.dineInRevenue?.toLocaleString() || 0}`} 
          sub={`₹${data?.summary?.takeawayRevenue?.toLocaleString() || 0} Takeaway`}
          icon={Users}
          color="#F4A261"
          loading={loading}
        />
      </div>

      {/* Top Row: Revenue Chart + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-10 rounded-[3.5rem] border border-[#3A241C]/5 shadow-sm">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-sm font-black text-[#3A241C] uppercase tracking-[0.3em]">Revenue Growth</h3>
              <p className="text-[11px] font-bold text-[#3A241C]/30 uppercase tracking-widest mt-2">Daily digital & cash trend</p>
            </div>
            <div className="flex items-center gap-2 text-[#6A994E] bg-[#6A994E]/10 px-4 py-2 rounded-2xl">
              <Zap size={14} className="fill-current" />
              <span className="text-[11px] font-black uppercase tracking-widest">Real-time Data</span>
            </div>
          </div>
          <div className="h-[400px]">
            {loading ? (
              <div className="w-full h-full bg-[#F9F7F4]/50 animate-pulse rounded-3xl" />
            ) : data?.dailyRevenue?.length > 0 ? (
              <ReactECharts 
                ref={el => { if (el) chartRefs.current[0] = el; }}
                option={revenueTimelineOption} 
                style={{ height: '100%', width: '100%' }} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#3A241C]/10 font-black uppercase tracking-[0.4em] text-xs gap-4">
                <LayoutDashboard size={48} />
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#3A241C] p-10 rounded-[3.5rem] text-white flex flex-col shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-[#E76F51]">
                <Star size={28} className="fill-current" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-[0.2em]">Smart Insights</h3>
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-1">Algorithmic analysis</p>
              </div>
            </div>
            <div className="space-y-8">
              {loading ? (
                [1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
              ) : data?.insights?.map((insight: any, i: number) => {
                const Icon = insight.type === 'peak' ? Clock : 
                             insight.type === 'top_item' ? Star :
                             insight.type === 'payment' ? Wallet : 
                             insight.type === 'trend' ? TrendingUp : Info;
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="flex gap-5 group"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex-shrink-0 flex items-center justify-center group-hover:bg-[#E76F51]/20 transition-all group-hover:scale-110">
                      <Icon size={20} className="text-[#E76F51]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{insight.type.replace('_', ' ')}</p>
                      <p className="text-sm font-bold text-white/80 leading-relaxed">{insight.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E76F51]/10 rounded-full blur-[100px] -mr-32 -mt-32" />
        </div>
      </div>

      {/* Middle Row: Top Items + Weekday Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-[#3A241C]/5 shadow-sm">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-[#3A241C]/5 rounded-xl flex items-center justify-center">
              <Coffee size={20} className="text-[#3A241C]" />
            </div>
            <h3 className="text-sm font-black text-[#3A241C] uppercase tracking-[0.3em]">Menu Performance</h3>
          </div>
          <div className="h-[450px]">
             <ReactECharts 
                ref={el => { if (el) chartRefs.current[1] = el; }}
                option={topItemsOption} 
                style={{ height: '100%', width: '100%' }} 
             />
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-[#3A241C]/5 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-[#E76F51]/10 rounded-xl flex items-center justify-center">
              <Layers size={20} className="text-[#E76F51]" />
            </div>
            <h3 className="text-sm font-black text-[#3A241C] uppercase tracking-[0.3em]">Weekly Habits</h3>
          </div>
          <div className="flex-1 min-h-[400px]">
            <ReactECharts 
              ref={el => { if (el) chartRefs.current[2] = el; }}
              option={weekdayHabitsOption} 
              style={{ height: '100%', width: '100%' }} 
            />
          </div>
          <div className="mt-6 flex justify-around text-center">
            {data?.weekdayPattern?.map((d: any) => (
              <div key={d.day}>
                <p className="text-[9px] font-black text-[#3A241C]/20 uppercase mb-1">{d.day.slice(0, 3)}</p>
                <p className="text-xs font-black text-[#3A241C]">₹{Math.round(d.revenue / 1000)}k</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Table Perf + Payment + Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-[#3A241C]/5 shadow-sm">
          <h3 className="text-[11px] font-black text-[#3A241C]/30 uppercase tracking-[0.3em] mb-10">Table Efficiency</h3>
          <div className="h-[300px]">
            <ReactECharts 
              ref={el => { if (el) chartRefs.current[3] = el; }}
              option={tablePerformanceOption} 
              style={{ height: '100%', width: '100%' }} 
            />
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-[#3A241C]/5 shadow-sm flex flex-col items-center">
          <h3 className="text-[11px] font-black text-[#3A241C]/30 uppercase tracking-[0.3em] mb-10 w-full">Payment Split</h3>
          <div className="relative w-full h-[250px]">
            <ReactECharts 
              ref={el => { if (el) chartRefs.current[4] = el; }}
              option={paymentDonutOption} 
              style={{ height: '100%', width: '100%' }} 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-4xl font-black text-[#3A241C]">{Math.round((data?.summary?.upiRevenue / data?.summary?.totalRevenue) * 100) || 0}%</p>
              <p className="text-[10px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mt-2">Digital Mix</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-[#3A241C]/5 shadow-sm flex flex-col">
          <h3 className="text-[11px] font-black text-[#3A241C]/30 uppercase tracking-[0.3em] mb-10 w-full">Peak Heartbeat</h3>
          <div className="flex-1 min-h-[250px]">
            <ReactECharts 
              ref={el => { if (el) chartRefs.current[5] = el; }}
              option={hourlyPatternOption} 
              style={{ height: '100%', width: '100%' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, loading }: any) {
  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-[#3A241C]/5 flex flex-col justify-between group hover:shadow-xl transition-all relative overflow-hidden active:scale-[0.98]">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:rotate-6 group-hover:scale-110 shadow-lg shadow-current/5"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon size={28} />
          </div>
          {loading && <Loader2 className="animate-spin text-[#3A241C]/10" size={18} />}
        </div>
        <div>
          <p className="text-[11px] font-black text-[#3A241C]/30 uppercase tracking-[0.2em] mb-2">{label}</p>
          <h3 className="text-4xl font-black text-[#3A241C] tracking-tighter">{value}</h3>
          <div className="flex items-center gap-2 mt-4 bg-[#F9F7F4] w-fit px-3 py-1.5 rounded-full border border-[#3A241C]/5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <p className="text-[10px] font-black text-[#3A241C]/60 tracking-widest uppercase">{sub}</p>
          </div>
        </div>
      </div>
      {/* Subtle Pattern */}
      <div className="absolute right-0 bottom-0 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
        <Icon size={120} />
      </div>
    </div>
  );
}
