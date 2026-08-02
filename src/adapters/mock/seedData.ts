/** AUTOGENERIERT aus public/demo/Testdaten_Alle_TN_Daten.xlsx +
 *  public/demo/Testdaten_Anwesenheitsliste.xlsx (beides Testdaten).
 *  Nicht von Hand editieren — Quelle sind die beiden Workbooks.
 *  Neu erzeugen: npm run seed:build
 */
export interface RawSeedRecord {
  m: number; id: string; nach: string; vor: string;
  workdays: number; status: string; ticketType: string; price: number;
  dist: number; plate: string | null; sozial: boolean; hasPraktikum: boolean;
  docs: { kind: string; fileName: string; state: string }[];
  att: [string, string, string][];
  notes: Record<string, string> | null;
  signedAt: string | null;
}

export const MONTH_LABELS = ["Januar","Februar","März"];

export const RAW_SEED: RawSeedRecord[] = [
  {
    "m": 1,
    "id": "BL01",
    "nach": "Kovač",
    "vor": "Milan",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 85.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "BL02",
    "nach": "Weber",
    "vor": "Sylvia",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "PKW",
    "price": 49,
    "dist": 31.4,
    "plate": "AP-SW 142",
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "BL03",
    "nach": "Nowak",
    "vor": "Tomasz",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "PKW",
    "price": 49,
    "dist": 46.8,
    "plate": "J-TN 887",
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "PK01",
    "nach": "Demir",
    "vor": "Aesha",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ABO",
    "price": 49,
    "dist": 4.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "PK02",
    "nach": "Fischer",
    "vor": "Katrin",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ABO",
    "price": 49,
    "dist": 22.6,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "PK03",
    "nach": "Haddad",
    "vor": "Nour",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ABO",
    "price": 49,
    "dist": 2.6,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "U",
        "U"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "PK04",
    "nach": "Amini",
    "vor": "Yusuf",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 6.8,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "PK05",
    "nach": "Petrova",
    "vor": "Irina",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 45.9,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "A",
        "A"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "PK06",
    "nach": "Lindner",
    "vor": "Jonas",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ONLINE",
    "price": 34,
    "dist": 22.1,
    "plate": null,
    "sozial": true,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 1,
    "id": "BL04",
    "nach": "Sarić",
    "vor": "Amila",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 85.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 1,
    "id": "BL05",
    "nach": "Öztürk",
    "vor": "Emre",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 46.8,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 1,
    "id": "PK07",
    "nach": "Bauer",
    "vor": "Melanie",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 5.1,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 1,
    "id": "PK08",
    "nach": "Ndiaye",
    "vor": "Fatou",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 3.9,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 1,
    "id": "PK09",
    "nach": "Krüger",
    "vor": "Stefan",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 7.4,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "(x)",
        "(x)"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "X",
        "X"
      ],
      [
        "2026-01-13",
        "X",
        "X"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 1,
    "id": "PK10",
    "nach": "Rahimi",
    "vor": "Zahra",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 22.1,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-01-01",
        "",
        ""
      ],
      [
        "2026-01-05",
        "X",
        "X"
      ],
      [
        "2026-01-06",
        "X",
        "X"
      ],
      [
        "2026-01-07",
        "X",
        "X"
      ],
      [
        "2026-01-08",
        "X",
        "X"
      ],
      [
        "2026-01-09",
        "X",
        "X"
      ],
      [
        "2026-01-12",
        "U",
        "U"
      ],
      [
        "2026-01-13",
        "U",
        "U"
      ],
      [
        "2026-01-14",
        "X",
        "X"
      ],
      [
        "2026-01-15",
        "X",
        "X"
      ],
      [
        "2026-01-16",
        "X",
        "X"
      ],
      [
        "2026-01-19",
        "X",
        "X"
      ],
      [
        "2026-01-20",
        "X",
        "X"
      ],
      [
        "2026-01-21",
        "X",
        "X"
      ],
      [
        "2026-01-22",
        "X",
        "X"
      ],
      [
        "2026-01-23",
        "X",
        "X"
      ],
      [
        "2026-01-26",
        "X",
        "X"
      ],
      [
        "2026-01-27",
        "X",
        "X"
      ],
      [
        "2026-01-28",
        "X",
        "X"
      ],
      [
        "2026-01-29",
        "X",
        "X"
      ],
      [
        "2026-01-30",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "BL01",
    "nach": "Kovač",
    "vor": "Milan",
    "workdays": 20,
    "status": "SENT_TO_ACCOUNTING",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 85.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 2,
    "id": "BL02",
    "nach": "Weber",
    "vor": "Sylvia",
    "workdays": 20,
    "status": "IN_REVIEW",
    "ticketType": "PKW",
    "price": 49,
    "dist": 31.4,
    "plate": "AP-SW 142",
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "BL03",
    "nach": "Nowak",
    "vor": "Tomasz",
    "workdays": 20,
    "status": "IN_REVIEW",
    "ticketType": "PKW",
    "price": 49,
    "dist": 46.8,
    "plate": "J-TN 887",
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK01",
    "nach": "Demir",
    "vor": "Aesha",
    "workdays": 20,
    "status": "AWAITING_CORRECTION",
    "ticketType": "ABO",
    "price": 49,
    "dist": 4.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "MISSING"
      }
    ],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "K",
        "K"
      ],
      [
        "2026-02-11",
        "E",
        "E"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK02",
    "nach": "Fischer",
    "vor": "Katrin",
    "workdays": 20,
    "status": "SENT_TO_ACCOUNTING",
    "ticketType": "ABO",
    "price": 49,
    "dist": 22.6,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 2,
    "id": "PK03",
    "nach": "Haddad",
    "vor": "Nour",
    "workdays": 20,
    "status": "IN_REVIEW",
    "ticketType": "ABO",
    "price": 49,
    "dist": 2.6,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK04",
    "nach": "Amini",
    "vor": "Yusuf",
    "workdays": 20,
    "status": "IN_REVIEW",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 6.8,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-02-02",
        "E",
        "E"
      ],
      [
        "2026-02-03",
        "E",
        "E"
      ],
      [
        "2026-02-04",
        "E",
        "E"
      ],
      [
        "2026-02-05",
        "E",
        "E"
      ],
      [
        "2026-02-06",
        "E",
        "E"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK05",
    "nach": "Petrova",
    "vor": "Irina",
    "workdays": 20,
    "status": "AWAITING_CORRECTION",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 45.9,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "MISSING"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK06",
    "nach": "Lindner",
    "vor": "Jonas",
    "workdays": 20,
    "status": "PAID",
    "ticketType": "ONLINE",
    "price": 34,
    "dist": 22.1,
    "plate": null,
    "sozial": true,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": "laut Excel"
  },
  {
    "m": 2,
    "id": "BL04",
    "nach": "Sarić",
    "vor": "Amila",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 85.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "BL05",
    "nach": "Öztürk",
    "vor": "Emre",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 46.8,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK07",
    "nach": "Bauer",
    "vor": "Melanie",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 5.1,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "U",
        "U"
      ],
      [
        "2026-02-17",
        "U",
        "U"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK08",
    "nach": "Ndiaye",
    "vor": "Fatou",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 3.9,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK09",
    "nach": "Krüger",
    "vor": "Stefan",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 7.4,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "X",
        "X"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 2,
    "id": "PK10",
    "nach": "Rahimi",
    "vor": "Zahra",
    "workdays": 20,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 22.1,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-02-02",
        "X",
        "X"
      ],
      [
        "2026-02-03",
        "X",
        "X"
      ],
      [
        "2026-02-04",
        "X",
        "X"
      ],
      [
        "2026-02-05",
        "X",
        "X"
      ],
      [
        "2026-02-06",
        "X",
        "X"
      ],
      [
        "2026-02-09",
        "X",
        "X"
      ],
      [
        "2026-02-10",
        "X",
        "X"
      ],
      [
        "2026-02-11",
        "X",
        "X"
      ],
      [
        "2026-02-12",
        "X",
        "X"
      ],
      [
        "2026-02-13",
        "X",
        "X"
      ],
      [
        "2026-02-16",
        "X",
        "X"
      ],
      [
        "2026-02-17",
        "X",
        "X"
      ],
      [
        "2026-02-18",
        "X",
        "X"
      ],
      [
        "2026-02-19",
        "X",
        "X"
      ],
      [
        "2026-02-20",
        "X",
        "X"
      ],
      [
        "2026-02-23",
        "X",
        "X"
      ],
      [
        "2026-02-24",
        "A",
        "A"
      ],
      [
        "2026-02-25",
        "X",
        "X"
      ],
      [
        "2026-02-26",
        "X",
        "X"
      ],
      [
        "2026-02-27",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "BL01",
    "nach": "Kovač",
    "vor": "Milan",
    "workdays": 22,
    "status": "IN_REVIEW",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 85.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "BL02",
    "nach": "Weber",
    "vor": "Sylvia",
    "workdays": 22,
    "status": "AWAITING_CORRECTION",
    "ticketType": "PKW",
    "price": 49,
    "dist": 31.4,
    "plate": "AP-SW 142",
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "BL03",
    "nach": "Nowak",
    "vor": "Tomasz",
    "workdays": 22,
    "status": "IN_REVIEW",
    "ticketType": "PKW",
    "price": 49,
    "dist": 46.8,
    "plate": "J-TN 887",
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK01",
    "nach": "Demir",
    "vor": "Aesha",
    "workdays": 22,
    "status": "IN_REVIEW",
    "ticketType": "ABO",
    "price": 49,
    "dist": 4.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "E",
        "E"
      ],
      [
        "2026-03-20",
        "E",
        "E"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": {
      "2026-03-16": "19. und 20. Feiertag"
    },
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK02",
    "nach": "Fischer",
    "vor": "Katrin",
    "workdays": 22,
    "status": "IN_REVIEW",
    "ticketType": "ABO",
    "price": 49,
    "dist": 22.6,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK03",
    "nach": "Haddad",
    "vor": "Nour",
    "workdays": 22,
    "status": "AWAITING_CORRECTION",
    "ticketType": "ABO",
    "price": 49,
    "dist": 2.6,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "MISSING"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK04",
    "nach": "Amini",
    "vor": "Yusuf",
    "workdays": 22,
    "status": "AWAITING_CORRECTION",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 6.8,
    "plate": null,
    "sozial": false,
    "hasPraktikum": true,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "MISSING"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "MISSING"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "MISSING"
      },
      {
        "kind": "PRAKTIKUM_CONTRACT",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": {
      "2026-03-16": "Praktikum 16.03.–31.03.2026"
    },
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK05",
    "nach": "Petrova",
    "vor": "Irina",
    "workdays": 22,
    "status": "IN_REVIEW",
    "ticketType": "ONLINE",
    "price": 49,
    "dist": 45.9,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK06",
    "nach": "Lindner",
    "vor": "Jonas",
    "workdays": 22,
    "status": "IN_REVIEW",
    "ticketType": "ONLINE",
    "price": 34,
    "dist": 22.1,
    "plate": null,
    "sozial": true,
    "hasPraktikum": false,
    "docs": [
      {
        "kind": "TICKET_PHOTO",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "INVOICE",
        "fileName": "",
        "state": "VERIFIED"
      },
      {
        "kind": "PAYMENT_PROOF",
        "fileName": "",
        "state": "VERIFIED"
      }
    ],
    "att": [
      [
        "2026-03-02",
        "",
        ""
      ],
      [
        "2026-03-03",
        "",
        ""
      ],
      [
        "2026-03-04",
        "",
        ""
      ],
      [
        "2026-03-05",
        "",
        ""
      ],
      [
        "2026-03-06",
        "",
        ""
      ],
      [
        "2026-03-09",
        "",
        ""
      ],
      [
        "2026-03-10",
        "",
        ""
      ],
      [
        "2026-03-11",
        "",
        ""
      ],
      [
        "2026-03-12",
        "",
        ""
      ],
      [
        "2026-03-13",
        "",
        ""
      ],
      [
        "2026-03-16",
        "A",
        "A"
      ],
      [
        "2026-03-17",
        "A",
        "A"
      ],
      [
        "2026-03-18",
        "A",
        "A"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": {
      "2026-03-16": "Wiedereinstieg 16.03."
    },
    "signedAt": null
  },
  {
    "m": 3,
    "id": "BL04",
    "nach": "Sarić",
    "vor": "Amila",
    "workdays": 22,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 85.2,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "BL05",
    "nach": "Öztürk",
    "vor": "Emre",
    "workdays": 22,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 46.8,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK07",
    "nach": "Bauer",
    "vor": "Melanie",
    "workdays": 22,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 5.1,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK08",
    "nach": "Ndiaye",
    "vor": "Fatou",
    "workdays": 22,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 3.9,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK09",
    "nach": "Krüger",
    "vor": "Stefan",
    "workdays": 22,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 7.4,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "K",
        "K"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  },
  {
    "m": 3,
    "id": "PK10",
    "nach": "Rahimi",
    "vor": "Zahra",
    "workdays": 22,
    "status": "NOT_SUBMITTED",
    "ticketType": "ABO",
    "price": 49,
    "dist": 22.1,
    "plate": null,
    "sozial": false,
    "hasPraktikum": false,
    "docs": [],
    "att": [
      [
        "2026-03-02",
        "X",
        "X"
      ],
      [
        "2026-03-03",
        "X",
        "X"
      ],
      [
        "2026-03-04",
        "X",
        "X"
      ],
      [
        "2026-03-05",
        "X",
        "X"
      ],
      [
        "2026-03-06",
        "X",
        "X"
      ],
      [
        "2026-03-09",
        "X",
        "X"
      ],
      [
        "2026-03-10",
        "X",
        "X"
      ],
      [
        "2026-03-11",
        "X",
        "X"
      ],
      [
        "2026-03-12",
        "X",
        "X"
      ],
      [
        "2026-03-13",
        "X",
        "X"
      ],
      [
        "2026-03-16",
        "X",
        "X"
      ],
      [
        "2026-03-17",
        "X",
        "X"
      ],
      [
        "2026-03-18",
        "X",
        "X"
      ],
      [
        "2026-03-19",
        "X",
        "X"
      ],
      [
        "2026-03-20",
        "X",
        "X"
      ],
      [
        "2026-03-23",
        "X",
        "X"
      ],
      [
        "2026-03-24",
        "X",
        "X"
      ],
      [
        "2026-03-25",
        "X",
        "X"
      ],
      [
        "2026-03-26",
        "X",
        "X"
      ],
      [
        "2026-03-27",
        "X",
        "X"
      ],
      [
        "2026-03-30",
        "X",
        "X"
      ],
      [
        "2026-03-31",
        "X",
        "X"
      ]
    ],
    "notes": null,
    "signedAt": null
  }
];

/** Stammdaten aus dem Tab 'Alle_TN_Daten' (Testdaten). */
export const RAW_MASTERS = [
  {
    "tnId": "BL01",
    "nachname": "Kovač",
    "vorname": "Milan",
    "strasse": "Heinrichstraße",
    "hausnr": "42",
    "plz": "07545",
    "ort": "Gera",
    "fahrtroute": "Gera – Erfurt, Wallstraße 18",
    "entfernungKm": 85.2,
    "kennzeichen": "",
    "kontoinhaber": "Milan Kovač",
    "iban": "DE37830500000004417092",
    "bank": "Sparkasse Gera-Greiz",
    "bic": "HELADEF1GER",
    "email": "milan.kovac@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "Deutschlandticket",
    "ticketart": "Online",
    "aboNummer": "",
    "vmtZone": "VMT Gesamtnetz",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/bl01"
  },
  {
    "tnId": "BL02",
    "nachname": "Weber",
    "vorname": "Sylvia",
    "strasse": "Bahnhofstraße",
    "hausnr": "7",
    "plz": "99510",
    "ort": "Apolda",
    "fahrtroute": "Apolda – Erfurt, Wallstraße 18",
    "entfernungKm": 31.4,
    "kennzeichen": "AP-SW 142",
    "kontoinhaber": "Sylvia Weber",
    "iban": "DE25820510000003308451",
    "bank": "Sparkasse Mittelthüringen",
    "bic": "HELADEF1WEM",
    "email": "sylvia.weber@example.invalid",
    "verkehrsmittel": "PKW",
    "ticket": "eigener PKW",
    "ticketart": "PKW",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/bl02"
  },
  {
    "tnId": "BL03",
    "nachname": "Nowak",
    "vorname": "Tomasz",
    "strasse": "Camburger Straße",
    "hausnr": "18",
    "plz": "07743",
    "ort": "Jena",
    "fahrtroute": "Jena – Erfurt, Wallstraße 18",
    "entfernungKm": 46.8,
    "kennzeichen": "J-TN 887",
    "kontoinhaber": "Tomasz Nowak",
    "iban": "DE84830530300005529164",
    "bank": "Sparkasse Jena-Saale-Holzland",
    "bic": "HELADEF1JEN",
    "email": "tomasz.nowak@example.invalid",
    "verkehrsmittel": "PKW",
    "ticket": "eigener PKW",
    "ticketart": "PKW",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/bl03"
  },
  {
    "tnId": "PK01",
    "nachname": "Demir",
    "vorname": "Aesha",
    "strasse": "Johannesstraße",
    "hausnr": "112",
    "plz": "99084",
    "ort": "Erfurt",
    "fahrtroute": "Erfurt Stadtverkehr",
    "entfernungKm": 4.2,
    "kennzeichen": "",
    "kontoinhaber": "Aesha Demir",
    "iban": "DE68820510000002214778",
    "bank": "Sparkasse Mittelthüringen",
    "bic": "HELADEF1WEM",
    "email": "aesha.demir@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "VMT Abo-Karte",
    "ticketart": "Abo_Karte",
    "aboNummer": "VMT-PK01-2026",
    "vmtZone": "City zone ERFURT (10)",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/pk01"
  },
  {
    "tnId": "PK02",
    "nachname": "Fischer",
    "vorname": "Katrin",
    "strasse": "Steubenstraße",
    "hausnr": "29",
    "plz": "99423",
    "ort": "Weimar",
    "fahrtroute": "Weimar – Erfurt, Wallstraße 18",
    "entfernungKm": 22.6,
    "kennzeichen": "",
    "kontoinhaber": "Katrin Fischer",
    "iban": "DE67820641880006612390",
    "bank": "VR Bank Weimar",
    "bic": "GENODEF1WE1",
    "email": "katrin.fischer@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "VMT Abo-Karte",
    "ticketart": "Abo_Karte",
    "aboNummer": "VMT-PK02-2026",
    "vmtZone": "Zone 20/10",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/pk02"
  },
  {
    "tnId": "PK03",
    "nachname": "Haddad",
    "vorname": "Nour",
    "strasse": "Pergamentergasse",
    "hausnr": "5",
    "plz": "99084",
    "ort": "Erfurt",
    "fahrtroute": "Erfurt Stadtverkehr",
    "entfernungKm": 2.6,
    "kennzeichen": "",
    "kontoinhaber": "Nour Haddad",
    "iban": "DE26820700240001173845",
    "bank": "Deutsche Bank Erfurt",
    "bic": "DEUTDE8EXXX",
    "email": "nour.haddad@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "VMT Abo-Karte",
    "ticketart": "Abo_Karte",
    "aboNummer": "VMT-PK03-2026",
    "vmtZone": "City zone ERFURT (10)",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/pk03"
  },
  {
    "tnId": "PK04",
    "nachname": "Amini",
    "vorname": "Yusuf",
    "strasse": "Magdeburger Allee",
    "hausnr": "87",
    "plz": "99089",
    "ort": "Erfurt",
    "fahrtroute": "Erfurt Stadtverkehr",
    "entfernungKm": 6.8,
    "kennzeichen": "",
    "kontoinhaber": "Yusuf Amini",
    "iban": "DE15820510000007745120",
    "bank": "Sparkasse Mittelthüringen",
    "bic": "HELADEF1WEM",
    "email": "yusuf.amini@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "Deutschlandticket",
    "ticketart": "Online",
    "aboNummer": "",
    "vmtZone": "City zone ERFURT (10)",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/pk04"
  },
  {
    "tnId": "PK05",
    "nachname": "Petrova",
    "vorname": "Irina",
    "strasse": "Wöllnitzer Straße",
    "hausnr": "14",
    "plz": "07749",
    "ort": "Jena",
    "fahrtroute": "Jena – Erfurt, Wallstraße 18",
    "entfernungKm": 45.9,
    "kennzeichen": "",
    "kontoinhaber": "Irina Petrova",
    "iban": "DE25830530300008836471",
    "bank": "Sparkasse Jena-Saale-Holzland",
    "bic": "HELADEF1JEN",
    "email": "irina.petrova@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "Deutschlandticket",
    "ticketart": "Online",
    "aboNummer": "",
    "vmtZone": "VMT Gesamtnetz",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/pk05"
  },
  {
    "tnId": "PK06",
    "nachname": "Lindner",
    "vorname": "Jonas",
    "strasse": "Ettersburger Straße",
    "hausnr": "63",
    "plz": "99425",
    "ort": "Weimar",
    "fahrtroute": "Weimar – Erfurt, Wallstraße 18",
    "entfernungKm": 22.1,
    "kennzeichen": "",
    "kontoinhaber": "Jonas Lindner",
    "iban": "DE78820641880009924063",
    "bank": "VR Bank Weimar",
    "bic": "GENODEF1WE1",
    "email": "jonas.lindner@example.invalid",
    "verkehrsmittel": "ÖPNV",
    "ticket": "Sozial-Deutschlandticket",
    "ticketart": "Online",
    "aboNummer": "",
    "vmtZone": "Zone 20/10",
    "bemerkungen": "",
    "lastUpdate": "15.03.2026",
    "berechnung": "Berechnungsrelevant",
    "cloud": "https://cloud.ibs-intern.invalid/tn/pk06"
  },
  {
    "tnId": "BL04",
    "nachname": "Sarić",
    "vorname": "Amila",
    "strasse": "Reichsstraße",
    "hausnr": "3",
    "plz": "07548",
    "ort": "Gera",
    "fahrtroute": "Gera – Erfurt, Wallstraße 18",
    "entfernungKm": 85.2,
    "kennzeichen": "",
    "kontoinhaber": "",
    "iban": "",
    "bank": "",
    "bic": "",
    "email": "amila.saric@example.invalid",
    "verkehrsmittel": "",
    "ticket": "",
    "ticketart": "unbekannt ?",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "nur Anwesenheitsliste — keine Fahrtkostenerstattung",
    "lastUpdate": "15.03.2026",
    "berechnung": "Nicht_relevant",
    "cloud": ""
  },
  {
    "tnId": "BL05",
    "nachname": "Öztürk",
    "vorname": "Emre",
    "strasse": "Winzerlaer Straße",
    "hausnr": "21",
    "plz": "07745",
    "ort": "Jena",
    "fahrtroute": "Jena – Erfurt, Wallstraße 18",
    "entfernungKm": 46.8,
    "kennzeichen": "",
    "kontoinhaber": "",
    "iban": "",
    "bank": "",
    "bic": "",
    "email": "emre.oeztuerk@example.invalid",
    "verkehrsmittel": "",
    "ticket": "",
    "ticketart": "unbekannt ?",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "nur Anwesenheitsliste — keine Fahrtkostenerstattung",
    "lastUpdate": "15.03.2026",
    "berechnung": "Nicht_relevant",
    "cloud": ""
  },
  {
    "tnId": "PK07",
    "nachname": "Bauer",
    "vorname": "Melanie",
    "strasse": "Nordhäuser Straße",
    "hausnr": "55",
    "plz": "99086",
    "ort": "Erfurt",
    "fahrtroute": "Erfurt Stadtverkehr",
    "entfernungKm": 5.1,
    "kennzeichen": "",
    "kontoinhaber": "",
    "iban": "",
    "bank": "",
    "bic": "",
    "email": "melanie.bauer@example.invalid",
    "verkehrsmittel": "",
    "ticket": "",
    "ticketart": "unbekannt ?",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "nur Anwesenheitsliste — keine Fahrtkostenerstattung",
    "lastUpdate": "15.03.2026",
    "berechnung": "Nicht_relevant",
    "cloud": ""
  },
  {
    "tnId": "PK08",
    "nachname": "Ndiaye",
    "vorname": "Fatou",
    "strasse": "Leipziger Straße",
    "hausnr": "9",
    "plz": "99085",
    "ort": "Erfurt",
    "fahrtroute": "Erfurt Stadtverkehr",
    "entfernungKm": 3.9,
    "kennzeichen": "",
    "kontoinhaber": "",
    "iban": "",
    "bank": "",
    "bic": "",
    "email": "fatou.ndiaye@example.invalid",
    "verkehrsmittel": "",
    "ticket": "",
    "ticketart": "unbekannt ?",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "nur Anwesenheitsliste — keine Fahrtkostenerstattung",
    "lastUpdate": "15.03.2026",
    "berechnung": "Nicht_relevant",
    "cloud": ""
  },
  {
    "tnId": "PK09",
    "nachname": "Krüger",
    "vorname": "Stefan",
    "strasse": "Bonemilchstraße",
    "hausnr": "17",
    "plz": "99094",
    "ort": "Erfurt",
    "fahrtroute": "Erfurt Stadtverkehr",
    "entfernungKm": 7.4,
    "kennzeichen": "",
    "kontoinhaber": "",
    "iban": "",
    "bank": "",
    "bic": "",
    "email": "stefan.krueger@example.invalid",
    "verkehrsmittel": "",
    "ticket": "",
    "ticketart": "unbekannt ?",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "nur Anwesenheitsliste — keine Fahrtkostenerstattung",
    "lastUpdate": "15.03.2026",
    "berechnung": "Nicht_relevant",
    "cloud": ""
  },
  {
    "tnId": "PK10",
    "nachname": "Rahimi",
    "vorname": "Zahra",
    "strasse": "Berkaer Straße",
    "hausnr": "31",
    "plz": "99427",
    "ort": "Weimar",
    "fahrtroute": "Weimar – Erfurt, Wallstraße 18",
    "entfernungKm": 22.1,
    "kennzeichen": "",
    "kontoinhaber": "",
    "iban": "",
    "bank": "",
    "bic": "",
    "email": "zahra.rahimi@example.invalid",
    "verkehrsmittel": "",
    "ticket": "",
    "ticketart": "unbekannt ?",
    "aboNummer": "",
    "vmtZone": "",
    "bemerkungen": "nur Anwesenheitsliste — keine Fahrtkostenerstattung",
    "lastUpdate": "15.03.2026",
    "berechnung": "Nicht_relevant",
    "cloud": ""
  }
] as const;
