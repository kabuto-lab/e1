/**
 * Bookings Management Page
 * Manage all bookings and reservations
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, DollarSign, User, Check, X, Eye, Filter, Search } from 'lucide-react';

interface Booking {
  id: string;
  modelName: string;
  modelId: string;
  clientName: string;
  clientId: string;
  date: string;
  time: string;
  duration: number; // hours
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  amount: number;
  location: string;
  createdAt: string;
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'BK-001',
    modelName: 'Юлианна',
    modelId: '1',
    clientName: 'Александр М.',
    clientId: 'C001',
    date: '2026-03-22',
    time: '19:00',
    duration: 3,
    status: 'confirmed',
    amount: 15000,
    location: 'Москва',
    createdAt: '2026-03-20',
  },
  {
    id: 'BK-002',
    modelName: 'Виктория',
    modelId: '2',
    clientName: 'Дмитрий К.',
    clientId: 'C002',
    date: '2026-03-22',
    time: '21:00',
    duration: 5,
    status: 'pending',
    amount: 35000,
    location: 'Санкт-Петербург',
    createdAt: '2026-03-21',
  },
  {
    id: 'BK-003',
    modelName: 'София',
    modelId: '4',
    clientName: 'Михаил С.',
    clientId: 'C003',
    date: '2026-03-21',
    time: '18:00',
    duration: 4,
    status: 'completed',
    amount: 45000,
    location: 'Дубай',
    createdAt: '2026-03-19',
  },
  {
    id: 'BK-004',
    modelName: 'Алина',
    modelId: '3',
    clientName: 'Андрей П.',
    clientId: 'C004',
    date: '2026-03-21',
    time: '20:00',
    duration: 2,
    status: 'cancelled',
    amount: 20000,
    location: 'Москва',
    createdAt: '2026-03-20',
  },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Load bookings from API
    setBookings(MOCK_BOOKINGS);
    setIsLoading(false);
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '✓ Подтверждено';
      case 'pending': return '⏳ Ожидание';
      case 'completed': return '✓ Завершено';
      case 'cancelled': return '✗ Отменено';
      default: return status;
    }
  };

  const handleApprove = async (bookingId: string) => {
    // TODO: API call to approve booking
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: 'confirmed' as const } : b
    ));
  };

  const handleReject = async (bookingId: string) => {
    // TODO: API call to reject booking
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
    ));
  };

  return (
    <div className="flex-1" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Unbounded, sans-serif' }}>Бронирования</h1>
          <p className="text-gray-400 text-sm">Управление бронированиями и встречами</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-300 rounded-lg hover:border-[#d4af37]/30 transition-all">
            <Filter className="w-4 h-4" />
            Фильтр
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black font-semibold rounded-lg hover:shadow-lg transition-all">
            <Calendar className="w-4 h-4" />
            Создать бронь
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-[#d4af37]" />
            <span className="text-gray-400 text-sm">Всего</span>
          </div>
          <div className="text-2xl font-bold text-white">{bookings.length}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Ожидают</span>
          </div>
          <div className="text-2xl font-bold text-white">{bookings.filter(b => b.status === 'pending').length}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Подтверждено</span>
          </div>
          <div className="text-2xl font-bold text-white">{bookings.filter(b => b.status === 'confirmed').length}</div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Доход (мес)</span>
          </div>
          <div className="text-2xl font-bold text-[#d4af37]">₽890K</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск бронирований..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl pl-12 pr-4 py-3 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Ожидают</option>
          <option value="confirmed">Подтверждено</option>
          <option value="completed">Завершено</option>
          <option value="cancelled">Отменено</option>
        </select>
      </div>

      {/* Bookings Table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333]">
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Модель</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Клиент</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Дата/Время</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Длительность</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Локация</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Сумма</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Статус</th>
              <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="border-b border-[#333] hover:bg-[#262626] transition-colors">
                <td className="py-4 px-6 text-sm text-gray-400 font-mono">{booking.id}</td>
                <td className="py-4 px-6">
                  <Link href={`/dashboard/models/${booking.modelId}`} className="text-sm text-white hover:text-[#d4af37] transition-colors">
                    {booking.modelName}
                  </Link>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-300">{booking.clientName}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="text-sm text-gray-300">{booking.date}</div>
                  <div className="text-xs text-gray-500">{booking.time}</div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-gray-300">{booking.duration} ч</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-gray-300">{booking.location}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-semibold text-[#d4af37]">₽{booking.amount.toLocaleString()}</span>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="p-2 hover:bg-[#333] rounded-lg transition-colors"
                      title="Просмотр"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </Link>
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(booking.id)}
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Подтвердить"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={() => handleReject(booking.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Отклонить"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-gray-400 text-sm">
          Показано {filteredBookings.length} из {bookings.length}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-400 rounded-lg hover:border-[#d4af37]/30 transition-all">
            ← Назад
          </button>
          <button className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-gray-400 rounded-lg hover:border-[#d4af37]/30 transition-all">
            Вперёд →
          </button>
        </div>
      </div>
    </div>
  );
}
