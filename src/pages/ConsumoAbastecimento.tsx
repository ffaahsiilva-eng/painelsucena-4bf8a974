// @ts-nocheck
import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useRefuelingData } from "@/hooks/useRefuelingData";
import { ExportConsumoAbastecimentoPdfButton } from "@/components/equipamentos/ExportConsumoAbastecimentoPdfButton";
import { ExportConsumoAbastecimentoExcelButton } from "@/components/equipamentos/ExportConsumoAbastecimentoExcelButton";
import { ShareConsumoWhatsappButton } from "@/components/equipamentos/ShareConsumoWhatsappButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import hydroLogo from "@/assets/logo-hydro.png";
import sucenaLogo from "@/assets/Sucena.png.asset.json";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatLiters(value: number): string {
  return value.toLocaleString("pt-BR");
}

export default function ConsumoAbastecimento() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data, isLoading } = useRefuelingData(selectedYear, selectedMonth, dateFrom || undefined, dateTo || undefined);

  // Filter daily records by selected vehicle, day, and date range
  const filteredDailyRecords = useMemo(() => {
    if (!data?.dailyRecords) return [];
    let filtered = data.dailyRecords;

    if (selectedVehicle !== "all") {
      filtered = filtered.filter((r) => r.equipmentId === selectedVehicle);
    }

    if (selectedDay !== null) {
      filtered = filtered.filter((r) => {
        const recordDay = parseInt(r.formattedDate.split('/')[0]);
        return recordDay === selectedDay;
      });
    }

    if (dateFrom) filtered = filtered.filter((r) => r.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((r) => r.date <= dateTo);

    return filtered;
  }, [data?.dailyRecords, selectedVehicle, selectedDay, dateFrom, dateTo]);

  // Filter refueling by point based on day filter
  const filteredRefuelingByPoint = useMemo(() => {
    if (!data?.dailyRecords || selectedDay === null) return data?.refuelingByPoint ?? [];
    
    // Recalculate from filtered records
    const pointMap = new Map<string, { count: number; liters: number }>();
    filteredDailyRecords.forEach((record) => {
      const existing = pointMap.get(record.point) || { count: 0, liters: 0 };
      pointMap.set(record.point, {
        count: existing.count + 1,
        liters: existing.liters + record.liters,
      });
    });
    
    return Array.from(pointMap.entries()).map(([point, stats]) => ({
      point,
      count: stats.count,
      liters: stats.liters,
    }));
  }, [data?.dailyRecords, data?.refuelingByPoint, selectedDay, filteredDailyRecords]);

  // Filter refueling by vehicle based on day filter
  const filteredRefuelingByVehicle = useMemo(() => {
    if (!data?.dailyRecords || selectedDay === null) return data?.refuelingByVehicle ?? [];
    
    // Recalculate from filtered records
    const vehicleMap = new Map<string, { vehicleName: string; count: number; liters: number }>();
    filteredDailyRecords.forEach((record) => {
      const existing = vehicleMap.get(record.vehicleName) || { vehicleName: record.vehicleName, count: 0, liters: 0 };
      vehicleMap.set(record.vehicleName, {
        vehicleName: record.vehicleName,
        count: existing.count + 1,
        liters: existing.liters + record.liters,
      });
    });
    
    return Array.from(vehicleMap.values());
  }, [data?.dailyRecords, data?.refuelingByVehicle, selectedDay, filteredDailyRecords]);

  // Get days in month for filter
  const daysInMonth = useMemo(() => {
    const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  // Get selected vehicle name for PDF
  const selectedVehicleName = useMemo(() => {
    if (selectedVehicle === "all") return "Todos os Veículos";
    const vehicle = data?.uniqueVehicles?.find(v => v.id === selectedVehicle);
    return vehicle ? `${vehicle.name} (${vehicle.plate})` : "Todos os Veículos";
  }, [selectedVehicle, data?.uniqueVehicles]);

  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - i
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px] bg-[#c4c9cf]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a1a2e]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#c4c9cf] -m-4 md:-m-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          {/* Logo Sucena */}
          <div className="flex items-center gap-2">
            <img loading="lazy" decoding="async" 
              src={sucenaLogo.url} 

              alt="Sucena Empreendimentos" 
              className="h-12 md:h-16 object-contain"
            />
          </div>

          {/* Título */}
          <div className="bg-[#f5a623] px-4 sm:px-8 py-2 rounded-sm">
            <h1 className="text-sm sm:text-lg md:text-xl font-bold text-[#1a1a2e] text-center">
              Relatório de Abastecimentos de Água
            </h1>
          </div>

          {/* Logo Hydro */}
          <div className="flex items-center">
            <img loading="lazy" decoding="async" 
              src={hydroLogo} 
              alt="Hydro" 
              className="h-12 md:h-16 object-contain"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <Select
            value={selectedDay?.toString() ?? "all"}
            onValueChange={(v) => setSelectedDay(v === "all" ? null : parseInt(v))}
          >
            <SelectTrigger className="w-[100px] bg-[#2d2d44] border-[#3d3d5c] text-white">
              <SelectValue placeholder="Dia" />
            </SelectTrigger>
            <SelectContent className="bg-[#2d2d44] border-[#3d3d5c] max-h-[300px]">
              <SelectItem value="all" className="text-white hover:bg-[#3d3d5c]">
                Todos
              </SelectItem>
              {daysInMonth.map((day) => (
                <SelectItem key={day} value={day.toString()} className="text-white hover:bg-[#3d3d5c]">
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => {
              setSelectedMonth(parseInt(v));
              setSelectedDay(null);
            }}
          >
            <SelectTrigger className="w-[140px] bg-[#2d2d44] border-[#3d3d5c] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2d2d44] border-[#3d3d5c]">
              {MONTH_NAMES.map((name, index) => (
                <SelectItem key={index} value={index.toString()} className="text-white hover:bg-[#3d3d5c]">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => {
              setSelectedYear(parseInt(v));
              setSelectedDay(null);
            }}
          >
            <SelectTrigger className="w-[100px] bg-[#2d2d44] border-[#3d3d5c] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2d2d44] border-[#3d3d5c]">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()} className="text-white hover:bg-[#3d3d5c]">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ExportConsumoAbastecimentoPdfButton
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDay={selectedDay}
            selectedVehicleName={selectedVehicleName}
            dailyRecords={filteredDailyRecords}
            refuelingByPoint={filteredRefuelingByPoint}
            refuelingByVehicle={filteredRefuelingByVehicle}
          />

          <ShareConsumoWhatsappButton
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDay={selectedDay}
            selectedVehicleName={selectedVehicleName}
            dailyRecords={filteredDailyRecords}
            refuelingByPoint={filteredRefuelingByPoint}
            refuelingByVehicle={filteredRefuelingByVehicle}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quantidade de Abastecimentos */}
          <div className="bg-[#2d2d44] rounded-lg p-4 border border-[#3d3d5c]">
            <h2 className="text-white text-center font-semibold mb-4">
              Quantidade de abastecimentos {selectedDay !== null && `(Dia ${selectedDay})`}
            </h2>
            {filteredRefuelingByPoint && filteredRefuelingByPoint.some(p => p.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={filteredRefuelingByPoint}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d3d5c" />
                  <XAxis 
                    dataKey="point" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#3d3d5c' }}
                    tickLine={{ stroke: '#3d3d5c' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#3d3d5c' }}
                    tickLine={{ stroke: '#3d3d5c' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}`, "Quantidade"]}
                    contentStyle={{
                      backgroundColor: "#2d2d44",
                      border: "1px solid #3d3d5c",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[0, 0, 0, 0]} stroke="#22d3ee" strokeWidth={2} fill="transparent">
                    {filteredRefuelingByPoint.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="transparent" stroke="#22d3ee" strokeWidth={2} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <p className="text-sm">Nenhum dado disponível</p>
              </div>
            )}
          </div>

          {/* Consumo Mensal de Água */}
          <div className="bg-[#2d2d44] rounded-lg p-4 border border-[#3d3d5c]">
            <h2 className="text-white text-center font-semibold mb-4">
              Consumo Mensal de Água Caminhão Pipa
            </h2>
            {data?.monthlyRefueling && data.monthlyRefueling.some(m => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthlyRefueling}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d3d5c" />
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                    axisLine={{ stroke: '#3d3d5c' }}
                    tickLine={{ stroke: '#3d3d5c' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#3d3d5c' }}
                    tickLine={{ stroke: '#3d3d5c' }}
                    tickFormatter={formatLiters}
                    label={{ 
                      value: 'Litros', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#9ca3af', fontSize: 11 }
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString("pt-BR")} L`, "Consumo"]}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{
                      backgroundColor: "#2d2d44",
                      border: "1px solid #3d3d5c",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="liters" stroke="#22d3ee" strokeWidth={2} fill="transparent">
                    {data.monthlyRefueling.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="transparent" stroke="#22d3ee" strokeWidth={2} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <p className="text-sm">Nenhum dado disponível para {selectedYear}</p>
              </div>
            )}
          </div>

          {/* Consumo por Veículo */}
          <div className="bg-[#2d2d44] rounded-lg p-4 border border-[#3d3d5c] lg:col-span-2">
            <h2 className="text-white text-center font-semibold mb-4">
              Consumo por Veículo {selectedDay !== null && `(Dia ${selectedDay})`}
            </h2>
            {filteredRefuelingByVehicle && filteredRefuelingByVehicle.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={filteredRefuelingByVehicle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d3d5c" />
                  <XAxis 
                    dataKey="vehicleName" 
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#3d3d5c' }}
                    tickLine={{ stroke: '#3d3d5c' }}
                    label={{ 
                      value: 'Veículo', 
                      position: 'insideBottom',
                      offset: -5,
                      style: { fill: '#9ca3af', fontSize: 11 }
                    }}
                  />
                  <YAxis 
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={{ stroke: '#3d3d5c' }}
                    tickLine={{ stroke: '#3d3d5c' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    label={{ 
                      value: 'Litros', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#9ca3af', fontSize: 11 }
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString("pt-BR")} L`, "Consumo"]}
                    contentStyle={{
                      backgroundColor: "#2d2d44",
                      border: "1px solid #3d3d5c",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="liters" stroke="#22d3ee" strokeWidth={2} fill="transparent">
                    {filteredRefuelingByVehicle.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="transparent" stroke="#22d3ee" strokeWidth={2} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                <p className="text-sm">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Abastecimentos por Dia */}
        <div className="mt-4 bg-[#2d2d44] rounded-lg p-4 border border-[#3d3d5c]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <h2 className="text-white font-semibold">
              Abastecimentos por Dia
            </h2>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col">
                <label className="text-xs text-gray-300 mb-1">De</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[150px] bg-[#1a1a2e] border-[#3d3d5c] text-white"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-300 mb-1">Até</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[150px] bg-[#1a1a2e] border-[#3d3d5c] text-white"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="bg-[#1a1a2e] border-[#3d3d5c] text-white hover:bg-[#3d3d5c]"
                >
                  Limpar
                </Button>
              )}
              <Select
                value={selectedVehicle}
                onValueChange={setSelectedVehicle}
              >
                <SelectTrigger className="w-[200px] bg-[#1a1a2e] border-[#3d3d5c] text-white">
                  <SelectValue placeholder="Filtrar por veículo" />
                </SelectTrigger>
                <SelectContent className="bg-[#2d2d44] border-[#3d3d5c]">
                  <SelectItem value="all" className="text-white hover:bg-[#3d3d5c]">
                    Todos os Veículos
                  </SelectItem>
                  {data?.uniqueVehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id} className="text-white hover:bg-[#3d3d5c]">
                      {vehicle.name} ({vehicle.plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ExportConsumoAbastecimentoExcelButton
                selectedVehicleName={selectedVehicleName}
                dateFrom={dateFrom || null}
                dateTo={dateTo || null}
                dailyRecords={filteredDailyRecords}
              />
            </div>
          </div>
          
          {filteredDailyRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#3d3d5c] hover:bg-transparent">
                    <TableHead className="text-gray-300">Data</TableHead>
                    <TableHead className="text-gray-300">Veículo</TableHead>
                    <TableHead className="text-gray-300">Placa</TableHead>
                    <TableHead className="text-gray-300">Ponto</TableHead>
                    <TableHead className="text-gray-300 text-right">Litros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDailyRecords.map((record, index) => (
                    <TableRow key={index} className="border-[#3d3d5c] hover:bg-[#3d3d5c]/50">
                      <TableCell className="text-white">{record.formattedDate}</TableCell>
                      <TableCell className="text-white">{record.vehicleName}</TableCell>
                      <TableCell className="text-gray-400">{record.plate}</TableCell>
                      <TableCell className="text-cyan-400">{record.point}</TableCell>
                      <TableCell className="text-white text-right">
                        {record.liters.toLocaleString("pt-BR")} L
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-gray-400">
              <p className="text-sm">Nenhum abastecimento registrado</p>
            </div>
          )}
          
          {/* Totais */}
          {filteredDailyRecords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#3d3d5c] flex justify-end">
              <div className="text-white">
                <span className="text-gray-400 mr-2">Total:</span>
                <span className="font-semibold text-cyan-400">
                  {filteredDailyRecords.length} abastecimento(s) - {filteredDailyRecords.reduce((acc, r) => acc + r.liters, 0).toLocaleString("pt-BR")} L
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 bg-[#f5a623] rounded-t-lg p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Social Links */}
            <div className="flex flex-col gap-1 text-[#1a1a2e] text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>sucenaempreendimentos</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 16.057v-3.057h2.994c-.059 1.143-.212 2.24-.456 3.279-.823-.12-1.674-.188-2.538-.222zm1.957 2.162c-.499 1.33-1.159 2.497-1.957 3.456v-3.62c.666.028 1.319.081 1.957.164zm-1.957-7.219v-3.015c.868-.034 1.721-.103 2.548-.224.238 1.027.389 2.111.446 3.239h-2.994zm0-5.014v-3.661c.806.969 1.471 2.15 1.971 3.496-.642.084-1.3.137-1.971.165zm2.703-3.267c1.237.496 2.354 1.228 3.29 2.146-.642.234-1.311.442-2.019.607-.344-.992-.775-1.91-1.271-2.753zm-7.241 13.56c-.244-1.039-.398-2.136-.456-3.279h2.994v3.057c-.865.034-1.714.102-2.538.222zm2.538 1.776v3.62c-.798-.959-1.458-2.126-1.957-3.456.638-.083 1.291-.136 1.957-.164zm-2.994-7.055c.057-1.128.207-2.212.446-3.239.827.121 1.68.19 2.548.224v3.015h-2.994zm1.024-5.179c.5-1.346 1.165-2.527 1.97-3.496v3.661c-.671-.028-1.329-.081-1.97-.165zm-2.005-.35c-.708-.165-1.377-.373-2.018-.607.937-.918 2.053-1.65 3.29-2.146-.496.844-.927 1.762-1.272 2.753zm-.549 1.918c-.264 1.151-.434 2.36-.492 3.611h-3.933c.165-1.658.739-3.197 1.617-4.518.88.361 1.816.67 2.808.907zm.009 9.262c-.988.236-1.92.542-2.797.9-.89-1.328-1.471-2.879-1.637-4.551h3.934c.058 1.265.231 2.488.5 3.651zm.553 1.917c.342.976.768 1.881 1.257 2.712-1.223-.49-2.326-1.211-3.256-2.115.636-.229 1.299-.435 1.999-.597zm9.924 0c.7.163 1.362.367 1.999.597-.931.903-2.034 1.625-3.257 2.116.489-.832.915-1.737 1.258-2.713zm.553-1.917c.27-1.163.442-2.386.501-3.651h3.934c-.167 1.672-.748 3.223-1.638 4.551-.877-.358-1.81-.664-2.797-.9zm.501-5.651c-.058-1.251-.229-2.46-.492-3.611.992-.237 1.929-.546 2.809-.907.877 1.321 1.451 2.86 1.616 4.518h-3.933z"/>
                </svg>
                <span>sucenaempreendimentos.eng.br</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span>sucena-empreendimentos</span>
              </div>
            </div>

            {/* Logo Sucena */}
            <div className="flex items-center">
              <img loading="lazy" decoding="async" 
                src="/logo-sucena-pdf.png" 
                alt="Sucena Empreendimentos" 
                className="h-12 md:h-14 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
