import { useMemo } from "react";
import { PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBrazilNorthDate } from "@/lib/timezone";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import birthdayBgVideo from "@/assets/birthday-bg.mp4.asset.json";
import femaleAvatar from "@/assets/female-avatar.png.asset.json";
import maleAvatar from "@/assets/male-avatar.png.asset.json";
import { isLikelyFemaleName } from "@/lib/gender";



const BirthdayBanner = () => {
  const { data } = useRHEfetivo();
  const colaboradoresAtivos = useMemo(
    () => (data?.colaboradores ?? []).filter((c: any) => c.status !== "inativo" && c.status !== "demitido"),
    [data?.colaboradores]
  );
  const today = getBrazilNorthDate();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const currentHour = today.getHours();
  
  // Only show today's birthdays until 16:00 (4 PM) Pará time
  const showTodayBirthdays = currentHour < 16;

  // Parse DD/MM/YYYY to { day, month }
  const parseBirthDate = (dateStr: string) => {
    const [day, month] = dateStr.split("/").map(Number);
    return { day, month };
  };

  // Get today's birthdays
  const todayBirthdays = useMemo(() => {
    if (!showTodayBirthdays) return [];
    return colaboradoresAtivos.filter((c) => {
      const { day, month } = parseBirthDate(c.dataNascimento);
      return day === currentDay && month === currentMonth;
    });
  }, [currentDay, currentMonth, showTodayBirthdays]);

  // Todos os aniversariantes do mês (visível o mês inteiro).
  const monthBirthdays = useMemo(() => {
    return colaboradoresAtivos
      .filter((c) => {
        const { month } = parseBirthDate(c.dataNascimento);
        return month === currentMonth;
      })
      .sort((a, b) => {
        const dayA = parseBirthDate(a.dataNascimento).day;
        const dayB = parseBirthDate(b.dataNascimento).day;
        return dayA - dayB;
      });
  }, [currentMonth, colaboradoresAtivos]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Don't render if no birthdays
  if (todayBirthdays.length === 0 && monthBirthdays.length === 0) {
    return null;
  }

  // Firework particles for animation
  const fireworkColors = [
    "bg-yellow-400", "bg-orange-400", "bg-pink-400", "bg-red-400", 
    "bg-purple-400", "bg-blue-400", "bg-green-400", "bg-amber-400"
  ];

  return (
    <div className="space-y-4">
      {/* Today's birthdays - custom banner style */}
      {todayBirthdays.length > 0 && (
        <div className="space-y-3">
          {todayBirthdays.map((person) => {
            const initials = person.nome
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <div
                key={person.id}
                className="relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-xl"
                style={{ aspectRatio: "2064 / 512" }}
              >

                <video
                  src={birthdayBgVideo.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  poster="/og-image.jpg"
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                />
                {/* Dark gradient overlay for text readability */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)",
                  }}
                />
                {/* Top label */}
                <div
                  className="absolute left-[6%] top-[8%] font-extrabold uppercase text-white tracking-wider"
                  style={{
                    fontSize: "clamp(10px, 1.6vw, 24px)",
                    textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                  }}
                >
                  🎉 Aniversariante do Dia
                </div>




                {/* Overlay: initials circle + name/role inside the empty dark card */}
                <div
                  className="absolute flex items-center gap-[2%]"
                  style={{
                    left: "6%",
                    right: "6%",
                    top: "38%",
                    bottom: "12%",
                  }}
                >


                  {isLikelyFemaleName(person.nome) ? (
                    <div
                      className="shrink-0 rounded-full overflow-hidden bg-[#f5a623] shadow-lg flex items-center justify-center"
                      style={{ height: "70%", aspectRatio: "1 / 1" }}
                    >
                      <img loading="lazy" decoding="async"
                        src={femaleAvatar.url}
                        alt={person.nome}
                        className="w-full h-full object-cover scale-[1.35]"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div
                      className="shrink-0 rounded-full overflow-hidden shadow-lg flex items-center justify-center"
                      style={{ height: "70%", aspectRatio: "1 / 1" }}
                    >
                      <img loading="lazy" decoding="async"
                        src={maleAvatar.url}
                        alt={person.nome}
                        className="w-full h-full object-cover scale-[1.35]"
                        draggable={false}
                      />
                    </div>
                  )}


                  <div className="min-w-0 flex-1">
                    <p
                      className="font-extrabold text-white uppercase leading-tight truncate"
                      style={{
                        fontSize: "clamp(9px, 1.4vw, 22px)",
                        letterSpacing: "0.02em",
                        textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                      }}
                    >
                      {person.nome}
                    </p>
                    <p
                      className="font-semibold uppercase text-white/85 leading-tight truncate mt-[3%]"
                      style={{
                        fontSize: "clamp(7px, 1vw, 16px)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {person.funcao}
                    </p>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}


      {/* Month's birthdays (only on day 1) */}
      {monthBirthdays.length > 0 && (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-xl mt-4">
          {/* Background Video */}
          <video
            src={birthdayBgVideo.url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none opacity-80"
          />
          {/* Light overlay to make it look creamy like the image */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-[2px]" />
          
          <div className="relative z-10 p-4 sm:p-5">
            {/* Inner glass box */}
            <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 p-4 sm:p-5 shadow-sm">
              
              {/* Title */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl drop-shadow-md">🎉</span>
                <h3 className="text-[#0a192f] font-extrabold text-lg sm:text-xl tracking-tight">
                  Aniversariantes de {monthNames[currentMonth - 1]}
                </h3>
                <div className="bg-[#0a192f] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-md">
                  {monthBirthdays.length}
                </div>
              </div>

              {/* List of pills */}
              <div className="flex flex-wrap gap-2">
                {monthBirthdays.map((person) => {
                  const { day } = parseBirthDate(person.dataNascimento);
                  const isToday = day === currentDay;
                  
                  return (
                    <div
                      key={person.id}
                      className={`flex items-center rounded-full p-1 pr-4 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border-t border-white/10 gap-3 ${
                        isToday 
                          ? "bg-gradient-to-b from-[#b58a48] to-[#8c652f]" 
                          : "bg-gradient-to-b from-[#1c2742] to-[#0a1122]"
                      }`}
                    >
                      <div className={`rounded-full px-3 py-1 flex items-center justify-center text-white font-bold text-sm shadow-inner ${
                        isToday ? "bg-[#d6ae67]" : "bg-[#425078]"
                      }`}>
                        {day.toString().padStart(2, "0")}
                      </div>
                      <span className="text-white font-semibold text-sm uppercase tracking-wide truncate max-w-[130px] sm:max-w-[180px]">
                        {person.nome.substring(0, 20)}{person.nome.length > 20 ? '...' : ''}
                      </span>
                      {isToday && <span className="ml-1 text-xs">🎂</span>}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BirthdayBanner;
