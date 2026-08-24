export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar: string;
  status: "active" | "vacation" | "leave";
  startDate: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "present" | "late" | "absent" | "justified";
}

export interface RaciItem {
  id: string;
  task: string;
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
}

export const employees: Employee[] = [
  { id: "1", name: "Reginaldo dos Santos", role: "Polivalente", department: "Operações", email: "reginaldo.santos@empresa.com", phone: "(11) 99999-0001", avatar: "RS", status: "active", startDate: "2022-01-15" },
  { id: "2", name: "Jailson Cardoso", role: "Polivalente", department: "Operações", email: "jailson.cardoso@empresa.com", phone: "(11) 99999-0002", avatar: "JC", status: "active", startDate: "2022-02-01" },
  { id: "3", name: "José Roberto", role: "Polivalente", department: "Operações", email: "jose.roberto@empresa.com", phone: "(11) 99999-0003", avatar: "JR", status: "active", startDate: "2021-06-10" },
  { id: "4", name: "Raimundo Pereira", role: "Meia Oficial", department: "Operações", email: "raimundo.pereira@empresa.com", phone: "(11) 99999-0004", avatar: "RP", status: "active", startDate: "2020-03-20" },
  { id: "5", name: "Flávio Henrique", role: "Ajudante", department: "Operações", email: "flavio.henrique@empresa.com", phone: "(11) 99999-0005", avatar: "FH", status: "active", startDate: "2023-01-05" },
  { id: "6", name: "Vinícius Junior", role: "Ajudante", department: "Operações", email: "vinicius.junior@empresa.com", phone: "(11) 99999-0006", avatar: "VJ", status: "active", startDate: "2023-02-15" },
  { id: "7", name: "Welber Santo", role: "Ajudante", department: "Operações", email: "welber.santo@empresa.com", phone: "(11) 99999-0007", avatar: "WS", status: "active", startDate: "2022-08-01" },
  { id: "8", name: "Filipe dos Santos", role: "Ajudante", department: "Operações", email: "filipe.santos@empresa.com", phone: "(11) 99999-0008", avatar: "FS", status: "active", startDate: "2022-09-10" },
  { id: "9", name: "Ezedequias Silva", role: "Ajudante", department: "Operações", email: "ezedequias.silva@empresa.com", phone: "(11) 99999-0009", avatar: "ES", status: "active", startDate: "2021-11-20" },
  { id: "10", name: "Jefferson Silva", role: "Jardineiro", department: "Operações", email: "jefferson.silva@empresa.com", phone: "(11) 99999-0010", avatar: "JS", status: "active", startDate: "2020-05-15" },
  { id: "11", name: "Edson Darley", role: "Jardineiro", department: "Operações", email: "edson.darley@empresa.com", phone: "(11) 99999-0011", avatar: "ED", status: "active", startDate: "2021-04-01" },
  { id: "12", name: "Ronaldinho dos Santos", role: "Jardineiro", department: "Operações", email: "ronaldinho.santos@empresa.com", phone: "(11) 99999-0012", avatar: "RD", status: "active", startDate: "2022-07-20" },
  { id: "13", name: "Anderson de Araujo", role: "Ajudante", department: "Operações", email: "anderson.araujo@empresa.com", phone: "(11) 99999-0013", avatar: "AA", status: "active", startDate: "2023-03-01" },
  { id: "14", name: "Josiel Souza", role: "Ajudante", department: "Operações", email: "josiel.souza@empresa.com", phone: "(11) 99999-0014", avatar: "JS", status: "active", startDate: "2022-12-01" },
  { id: "15", name: "Jeferson", role: "Ajudante", department: "Operações", email: "jeferson@empresa.com", phone: "(11) 99999-0015", avatar: "JE", status: "active", startDate: "2023-04-15" },
  { id: "16", name: "Edielson Marinho", role: "Motorista do Pipa", department: "Transporte", email: "edielson.marinho@empresa.com", phone: "(11) 99999-0016", avatar: "EM", status: "active", startDate: "2019-08-10" },
  { id: "17", name: "Anderson da Cruz", role: "Motorista do Pipa", department: "Transporte", email: "anderson.cruz@empresa.com", phone: "(11) 99999-0017", avatar: "AC", status: "active", startDate: "2020-02-20" },
  { id: "18", name: "Paulo Félix", role: "Motorista do Pipa", department: "Transporte", email: "paulo.felix@empresa.com", phone: "(11) 99999-0018", avatar: "PF", status: "active", startDate: "2021-01-15" },
  { id: "19", name: "Wellington", role: "Motorista do Pipa", department: "Transporte", email: "wellington@empresa.com", phone: "(11) 99999-0019", avatar: "WE", status: "active", startDate: "2022-05-01" },
  { id: "20", name: "Fábio Remédio", role: "Motorista do Pipa", department: "Transporte", email: "fabio.remedio@empresa.com", phone: "(11) 99999-0020", avatar: "FR", status: "active", startDate: "2021-09-10" },
  { id: "21", name: "Marcelino", role: "Motorista do Munck", department: "Transporte", email: "marcelino@empresa.com", phone: "(11) 99999-0021", avatar: "MA", status: "active", startDate: "2018-06-01" },
  { id: "22", name: "Thaylon Silva", role: "Sinaleiro", department: "Operações", email: "thaylon.silva@empresa.com", phone: "(11) 99999-0022", avatar: "TS", status: "active", startDate: "2022-10-15" },
  { id: "23", name: "Antônio Erick", role: "Mecânico Montador", department: "Manutenção", email: "antonio.erick@empresa.com", phone: "(11) 99999-0023", avatar: "AE", status: "active", startDate: "2019-03-20" },
  { id: "24", name: "Marcelo Pinheiro", role: "Auxiliar de Elétrica", department: "Manutenção", email: "marcelo.pinheiro@empresa.com", phone: "(11) 99999-0024", avatar: "MP", status: "active", startDate: "2020-11-01" },
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: "1", employeeId: "1", employeeName: "Reginaldo dos Santos", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "2", employeeId: "2", employeeName: "Jailson Cardoso", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "3", employeeId: "3", employeeName: "José Roberto", date: "2024-01-23", checkIn: "08:45", checkOut: "18:00", status: "late" },
  { id: "4", employeeId: "4", employeeName: "Raimundo Pereira", date: "2024-01-23", checkIn: "07:55", checkOut: "17:00", status: "present" },
  { id: "5", employeeId: "5", employeeName: "Flávio Henrique", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "6", employeeId: "6", employeeName: "Vinícius Junior", date: "2024-01-23", checkIn: "09:00", checkOut: "18:30", status: "late" },
  { id: "7", employeeId: "7", employeeName: "Welber Santo", date: "2024-01-23", checkIn: "-", checkOut: "-", status: "justified" },
  { id: "8", employeeId: "8", employeeName: "Filipe dos Santos", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "9", employeeId: "9", employeeName: "Ezedequias Silva", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "10", employeeId: "10", employeeName: "Jefferson Silva", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "11", employeeId: "11", employeeName: "Edson Darley", date: "2024-01-23", checkIn: "08:30", checkOut: "18:00", status: "late" },
  { id: "12", employeeId: "12", employeeName: "Ronaldinho dos Santos", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "13", employeeId: "13", employeeName: "Anderson de Araujo", date: "2024-01-23", checkIn: "-", checkOut: "-", status: "absent" },
  { id: "14", employeeId: "14", employeeName: "Josiel Souza", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "15", employeeId: "15", employeeName: "Jeferson", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "16", employeeId: "16", employeeName: "Edielson Marinho", date: "2024-01-23", checkIn: "07:50", checkOut: "17:00", status: "present" },
  { id: "17", employeeId: "17", employeeName: "Anderson da Cruz", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "18", employeeId: "18", employeeName: "Paulo Félix", date: "2024-01-23", checkIn: "-", checkOut: "-", status: "justified" },
  { id: "19", employeeId: "19", employeeName: "Wellington", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "20", employeeId: "20", employeeName: "Fábio Remédio", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "21", employeeId: "21", employeeName: "Marcelino", date: "2024-01-23", checkIn: "07:55", checkOut: "17:00", status: "present" },
  { id: "22", employeeId: "22", employeeName: "Thaylon Silva", date: "2024-01-23", checkIn: "08:15", checkOut: "17:45", status: "late" },
  { id: "23", employeeId: "23", employeeName: "Antônio Erick", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
  { id: "24", employeeId: "24", employeeName: "Marcelo Pinheiro", date: "2024-01-23", checkIn: "08:00", checkOut: "17:30", status: "present" },
];

export const raciMatrix: RaciItem[] = [
  {
    id: "1",
    task: "Planejamento de Sprint",
    responsible: ["Reginaldo dos Santos"],
    accountable: "Antônio Erick",
    consulted: ["Marcelo Pinheiro", "Marcelino"],
    informed: ["Jailson Cardoso"],
  },
  {
    id: "2",
    task: "Manutenção de Equipamentos",
    responsible: ["Antônio Erick", "Marcelo Pinheiro"],
    accountable: "Marcelino",
    consulted: ["Reginaldo dos Santos"],
    informed: ["Edielson Marinho", "Anderson da Cruz"],
  },
  {
    id: "3",
    task: "Operação de Transporte",
    responsible: ["Edielson Marinho", "Anderson da Cruz", "Paulo Félix"],
    accountable: "Marcelino",
    consulted: ["Wellington"],
    informed: ["Fábio Remédio"],
  },
  {
    id: "4",
    task: "Jardinagem e Paisagismo",
    responsible: ["Jefferson Silva", "Edson Darley", "Ronaldinho dos Santos"],
    accountable: "Reginaldo dos Santos",
    consulted: ["Jailson Cardoso"],
    informed: ["José Roberto"],
  },
  {
    id: "5",
    task: "Sinalização de Obras",
    responsible: ["Thaylon Silva"],
    accountable: "Raimundo Pereira",
    consulted: ["Marcelino"],
    informed: ["Flávio Henrique", "Vinícius Junior"],
  },
];

export const departments = ["Operações", "Transporte", "Manutenção"];
