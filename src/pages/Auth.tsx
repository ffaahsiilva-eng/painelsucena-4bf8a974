/* Me mande todo o prompt da tela de login para eu extrair e colocar em outro site */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, User, Lock, UserCircle } from "lucide-react";
import { z } from "zod";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { clearStoredEnvironment } from "@/hooks/useEnvironment";

const cargoOptions = [
  { value: "moderador", label: "Moderador" },
  { value: "preposto", label: "Preposto" },
  { value: "encarregado_geral", label: "Encarregado Geral" },
  { value: "encarregado_i", label: "Encarregado I" },
  { value: "encarregado_ii", label: "Encarregado II" },
  { value: "tecnico_seguranca_i", label: "Técnico de Segurança I" },
  { value: "tecnico_seguranca_ii", label: "Técnico de Segurança II" },
  { value: "tecnico_meio_ambiente", label: "Técnico Meio Ambiente" },
  { value: "aux_administrativo", label: "Aux. Administrativo" },
  { value: "aux_almoxarifado", label: "Aux. Almoxarifado" },
  { value: "planejador", label: "Planejador" },
  { value: "engenheiro_civil", label: "Engenheiro Civil" },
  { value: "engenheiro_planejamento", label: "Engenheiro de Planejamento" },
  { value: "tecnico_planejamento", label: "Técnico de Planejamento" },
  { value: "engenheiro_seguranca", label: "Engenheiro de Segurança" },
  { value: "motorista_pipa", label: "Motorista de Pipa" },
  { value: "motorista_munk", label: "Motorista Operador de Munk" },
] as const;

type CargoType = typeof cargoOptions[number]["value"];

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cargo: z.string().min(1, "Selecione um cargo"),
});

// Helper to dispatch the global overlay event
const dispatchTransitionEvent = () => {
  window.dispatchEvent(new Event("login-transition"));
};

const clearTransitionStorage = () => {
  sessionStorage.removeItem("loginTransitionInProgress");
  sessionStorage.removeItem("loginTransitionStage");
  sessionStorage.removeItem("loginTransitionPayload");
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isSuccess, setIsSuccess] = useState(() => sessionStorage.getItem("loginTransitionInProgress") === "true");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cargo, setCargo] = useState<CargoType | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [occupiedCargos, setOccupiedCargos] = useState<string[]>([]);
  const [previewAvatar, setPreviewAvatar] = useState<string>("");
  const [previewName, setPreviewName] = useState<string>("");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings: envSettings, isLoading: settingsLoading } = useSiteSettings();
  

  // Fetch all site settings to check if signup is enabled in ANY environment
  // (since user hasn't selected an environment yet on login screen)
  const { data: allSettings, isLoading: allSettingsLoading } = useQuery({
    queryKey: ["all-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("show_signup_button");
      return data || [];
    }
  });

  const showSignup = useMemo(() => {
    // If enabled in current environment
    if (envSettings.show_signup_button) return true;
    // Or if enabled in any other environment record
    if (allSettings && allSettings.length > 0) {
      return allSettings.some(s => s.show_signup_button);
    }
    return false;
  }, [envSettings.show_signup_button, allSettings]);

  // Fetch occupied cargos on mount
  useEffect(() => {
    const fetchOccupiedCargos = async () => {
      const { data, error } = await supabase.from("profiles").select("cargo");
      if (!error && data) {
        const occupied = data.map((p) => p.cargo).filter(Boolean);
        setOccupiedCargos(occupied);
      }
    };
    fetchOccupiedCargos();
  }, []);

  // Load remembered credentials
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  // Preview avatar/name when remembered email matches
  useEffect(() => {
    if (!isLogin) {
      setPreviewAvatar("");
      setPreviewName("");
      return;
    }

    const loadRememberedData = async () => {
      const savedEmail = localStorage.getItem("rememberedEmail");
      const savedAvatar = localStorage.getItem("rememberedAvatar");
      const savedName = localStorage.getItem("rememberedName");

      if (email && savedEmail && email.toLowerCase() === savedEmail.toLowerCase()) {
        if (savedAvatar) {
          const { resolveStorageUrl } = await import("@/lib/storage");
          const resolvedUrl = await resolveStorageUrl(savedAvatar);
          setPreviewAvatar(resolvedUrl);
        }
        if (savedName) setPreviewName(savedName);
      } else {
        setPreviewAvatar("");
        setPreviewName("");
      }
    };

    loadRememberedData();
  }, [email, isLogin]);

  // Redirect if already logged in (no transition needed for existing session)
  useEffect(() => {
    // If global transition is in progress, don't interfere
    if (sessionStorage.getItem("loginTransitionInProgress") === "true") return;
    if (sessionStorage.getItem("logoutTransitionInProgress") === "true") return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/", { replace: true });
      }
    });
  }, [navigate]);

  const validateForm = () => {
    setErrors({});
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, fullName, cargo });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    // Sempre limpa o ambiente selecionado para forçar o picker após o login
    clearStoredEnvironment();

    // Show global overlay immediately (pending state) to prevent any flash
    sessionStorage.setItem("loginTransitionInProgress", "true");
    sessionStorage.setItem("loginTransitionStage", "pending");
    dispatchTransitionEvent();
    setIsSuccess(true);

    const loginStartedAt = performance.now();
    try {
      if (isLogin) {
        // Retry automático: "Failed to fetch" é falha de rede/instabilidade,
        // não credencial inválida. Tenta até 3x com backoff curto.
        let authData: any = null;
        let error: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await supabase.auth.signInWithPassword({ email, password });
          authData = result.data;
          error = result.error;
          const isNetworkError =
            !!error &&
            (/failed to fetch|network|load failed|timeout/i.test(error.message || "") ||
              (error as any)?.name === "AuthRetryableFetchError");
          if (!isNetworkError) break;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }

        if (error) {
          clearTransitionStorage();
          dispatchTransitionEvent();
          setIsSuccess(false);
          const isNetworkError =
            /failed to fetch|network|load failed|timeout/i.test(error.message || "") ||
            (error as any)?.name === "AuthRetryableFetchError";
          // Log failed attempt (fire-and-forget) — evita ruído quando está offline
          if (!isNetworkError) {
            import("@/lib/security/authLog").then((m) =>
              m.logAuthAttempt({ email, success: false, failureReason: error.message })
            );
            import("@/lib/loginAudit").then((m) =>
              m.logLoginAttempt({
                email,
                success: false,
                errorCode: (error as any)?.code || null,
                errorMessage: error.message,
                durationMs: Math.round(performance.now() - loginStartedAt),
              })
            );
          }
          if (isNetworkError) {
            toast({
              title: "Sem conexão com o servidor",
              description:
                "Não foi possível conectar. Verifique sua internet e tente novamente.",
              variant: "destructive",
            });
          } else if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Erro no login",
              description: "Email ou senha incorretos",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro no login",
              description: error.message,
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return;
        }


        // Log successful attempt
        import("@/lib/security/authLog").then((m) =>
          m.logAuthAttempt({ email, success: true })
        );
        import("@/lib/loginAudit").then((m) =>
          m.logLoginAttempt({
            email,
            success: true,
            userId: authData?.user?.id || null,
            durationMs: Math.round(performance.now() - loginStartedAt),
          })
        );

        // Fetch profile data
        let nextUserName = "";
        let nextUserAvatar = "";
        let nextUserCargo = "";

        if (authData.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, cargo")
            .eq("user_id", authData.user.id)
            .single();

          if (profileData?.full_name) {
            nextUserName = profileData.full_name;
            if (rememberMe) {
              localStorage.setItem("rememberedName", nextUserName);
            }
          }
          if (profileData?.avatar_url) {
            nextUserAvatar = profileData.avatar_url;
            if (rememberMe) {
              localStorage.setItem("rememberedAvatar", nextUserAvatar);
            }
          }
          if (profileData?.cargo) {
            nextUserCargo =
              cargoOptions.find((c) => c.value === profileData.cargo)?.label ||
              profileData.cargo;
          }
        }

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
          localStorage.setItem("rememberedPassword", password);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
          localStorage.removeItem("rememberedAvatar");
          localStorage.removeItem("rememberedName");
        }

        // Mark session tab as active BEFORE navigating to protected route
        sessionStorage.setItem("session_tab_active", "1");

        // Switch global overlay to "play" stage with user data
        const { resolveStorageUrl } = await import("@/lib/storage");
        const resolvedAvatar = nextUserAvatar ? await resolveStorageUrl(nextUserAvatar) : "";

        sessionStorage.setItem(
          "loginTransitionPayload",
          JSON.stringify({
            userName: nextUserName,
            userAvatar: resolvedAvatar,
            userCargo: nextUserCargo,
            destination: "/selecao-ambiente",
          })
        );
        sessionStorage.setItem("loginTransitionStage", "play");
        dispatchTransitionEvent();
      } else {
        // Signup flow
        if (occupiedCargos.includes(cargo)) {
          const cargoLabel =
            cargoOptions.find((c) => c.value === cargo)?.label || cargo;
          clearTransitionStorage();
          dispatchTransitionEvent();
          setIsSuccess(false);
          toast({
            title: "Cargo já ocupado",
            description: `Já existe um usuário cadastrado como ${cargoLabel}.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });

        if (error) {
          clearTransitionStorage();
          dispatchTransitionEvent();
          setIsSuccess(false);
          if (error.message.includes("User already registered")) {
            toast({
              title: "Erro no cadastro",
              description: "Este email já está cadastrado. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro no cadastro",
              description: error.message,
              variant: "destructive",
            });
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({
            user_id: data.user.id,
            full_name: fullName,
            cargo: cargo as CargoType,
            environment: "barcarena",
          });

          if (profileError) {
            clearTransitionStorage();
            dispatchTransitionEvent();
            setIsSuccess(false);
            toast({
              title: "Erro ao criar perfil",
              description: profileError.message,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          setOccupiedCargos((prev) => [...prev, cargo]);
          const firstName = fullName;
          const cargoLabel =
            cargoOptions.find((c) => c.value === cargo)?.label || cargo;

          // Mark session tab as active BEFORE navigating to protected route
          sessionStorage.setItem("session_tab_active", "1");

          // Switch global overlay to "play" stage
          sessionStorage.setItem(
            "loginTransitionPayload",
            JSON.stringify({
              userName: firstName,
              userCargo: cargoLabel,
              destination: "/selecao-ambiente",
            })
          );
          sessionStorage.setItem("loginTransitionStage", "play");
          dispatchTransitionEvent();
        }
      }
    } catch (error) {
      clearTransitionStorage();
      dispatchTransitionEvent();
      setIsSuccess(false);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return <div className="fixed inset-0 bg-[#010101] z-50" />;
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      {/* Gradient background */}
      <AuthBackground />

      {/* Login form - centered */}
      <div className="relative z-10 w-full max-w-xs px-4 animate-fade-in">
        {/* Avatar icon */}
        <div className="flex flex-col items-center mb-6">
          <div
            id="login-avatar"
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden transition-all duration-500 ${
              previewAvatar
                ? "ring-2 ring-white/50 ring-offset-2 ring-offset-transparent"
                : "bg-gray-400/80"
            }`}
          >
            {previewAvatar ? (
              <img loading="lazy" decoding="async"
                src={previewAvatar}
                alt="Avatar do usuário"
                className="w-full h-full object-cover animate-fade-in"
              />
            ) : (
              <User className="w-9 h-9 text-white/90" strokeWidth={1.5} />
            )}
          </div>
          {previewName && (
            <div className="mt-3 animate-fade-in">
              <span className="text-sm font-medium tracking-wide">
                <span className="!text-white" style={{ color: "white" }}>Olá, {previewName}!</span>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full name field (signup only) */}
          {!isLogin && (
            <div className="space-y-1">
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome Completo"
                  className="pl-10 h-9 bg-white/95 border-0 text-gray-700 text-sm placeholder:text-gray-400 rounded shadow-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {errors.fullName && (
                <p className="text-red-300 text-xs pl-2">{errors.fullName}</p>
              )}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="pl-10 h-9 bg-white/95 border-0 text-gray-700 text-sm placeholder:text-gray-400 rounded shadow-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {errors.email && (
              <p className="text-red-300 text-xs pl-2">{errors.email}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="pl-10 pr-10 h-9 bg-white/95 border-0 text-gray-700 text-sm placeholder:text-gray-400 rounded shadow-sm focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-300 text-xs pl-2">{errors.password}</p>
            )}
          </div>

          {/* Cargo field (signup only) */}
          {!isLogin && (
            <div className="space-y-1">
              <Select
                value={cargo}
                onValueChange={(value) => {
                  if (!occupiedCargos.includes(value)) {
                    setCargo(value as CargoType);
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-white/95 border-0 text-gray-700 text-sm rounded shadow-sm focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Selecione seu cargo" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {cargoOptions.map((option) => {
                    const isOccupied = occupiedCargos.includes(option.value);
                    return (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={isOccupied}
                        className={`text-sm ${
                          isOccupied
                            ? "text-gray-400 cursor-not-allowed line-through"
                            : "text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                        }`}
                      >
                        {option.label} {isOccupied && "(Ocupado)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.cargo && (
                <p className="text-red-300 text-xs pl-2">{errors.cargo}</p>
              )}
            </div>
          )}

          {/* Remember me (login only) */}
          {isLogin && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-1.5">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white/60 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-blue-600 h-3 w-3"
                />
                <label
                  htmlFor="rememberMe"
                  className="text-white/80 text-[11px] cursor-pointer select-none text-justify font-extrabold"
                >
                  Lembrar Email e Senha
                </label>
              </div>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-9 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium tracking-wide rounded shadow-lg transition-all duration-200 mt-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              <span className="!text-white" style={{ color: "white" }}>ENTRAR</span>
            ) : (
              <span className="!text-white" style={{ color: "white" }}>CADASTRAR</span>
            )}
          </Button>

        </form>

        {/* Toggle signup / login */}
        {(showSignup || !isLogin) && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs underline underline-offset-2 transition-colors"
            >
              <span className="!text-white" style={{ color: "white" }}>
                {isLogin ? "Criar uma conta" : "Já tenho uma conta"}
              </span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Auth;
