import { DEFAULT_GADA_OPTIONS } from "@/lib/gada/constants";
import type { GadaInput } from "@/lib/gada/types";

export const laundrySeedInput: GadaInput = {
  datasetName: "UNSRI Student Laundry Evaluation (Group 6)",
  criteria: [
  {
    "id": "c1",
    "code": "C1",
    "name": "Tarif Cuci Lipat",
    "type": "cost",
    "missingStrategy": "penalty_max",
    "active": true,
    "unit": "Rp"
  },
  {
    "id": "c2",
    "code": "C2",
    "name": "Tarif Cuci Setrika",
    "type": "cost",
    "missingStrategy": "penalty_max",
    "active": true,
    "unit": "Rp"
  },
  {
    "id": "c3",
    "code": "C3",
    "name": "Tarif Paket Kilat",
    "type": "cost",
    "missingStrategy": "custom_penalty",
    "customPenalty": 20000,
    "active": true,
    "unit": "Rp"
  },
  {
    "id": "c4",
    "code": "C4",
    "name": "Jarak dari Kampus",
    "type": "cost",
    "missingStrategy": "penalty_max",
    "active": true,
    "unit": "m"
  },
  {
    "id": "c5",
    "code": "C5",
    "name": "Durasi Pengerjaan",
    "type": "cost",
    "missingStrategy": "penalty_max",
    "active": true,
    "unit": "hari"
  },
  {
    "id": "c6",
    "code": "C6",
    "name": "Batas Minimal Berat",
    "type": "cost",
    "missingStrategy": "min_value",
    "active": true,
    "unit": "kg"
  },
  {
    "id": "c7",
    "code": "C7",
    "name": "Jam Operasional",
    "type": "benefit",
    "missingStrategy": "min_value",
    "active": true,
    "unit": "jam"
  },
  {
    "id": "c8",
    "code": "C8",
    "name": "Layanan Antar-Jemput",
    "type": "benefit",
    "missingStrategy": "min_value",
    "active": true,
    "isBinary": true
  },
  {
    "id": "qris",
    "code": "QRIS",
    "name": "Pembayaran QRIS",
    "type": "benefit",
    "missingStrategy": "min_value",
    "active": true,
    "isBinary": true
  },
  {
    "id": "c9",
    "code": "C9",
    "name": "Garansi Pakaian",
    "type": "benefit",
    "missingStrategy": "min_value",
    "active": true,
    "isBinary": true
  }
],
  alternatives: [
  {
    "id": "alt-1",
    "name": "Laundry Bedeng Putih",
    "address": "Gang Lampung 1"
  },
  {
    "id": "alt-2",
    "name": "Laundry Pangeran",
    "address": "Gang Buntu"
  },
  {
    "id": "alt-3",
    "name": "Laundry Neng Emi",
    "address": "Gang Buntu"
  },
  {
    "id": "alt-4",
    "name": "Apix Laundry",
    "address": "Griya Sejahtera"
  },
  {
    "id": "alt-5",
    "name": "Ama Laundry",
    "address": "Jalan Nusantara"
  },
  {
    "id": "alt-6",
    "name": "Kaysha Laundry",
    "address": "Gang Buntu"
  },
  {
    "id": "alt-7",
    "name": "Cekgu Laundry",
    "address": "Jalan Nusantara"
  },
  {
    "id": "alt-8",
    "name": "Mely Laundry",
    "address": "Jalan Jati Mas"
  },
  {
    "id": "alt-9",
    "name": "Nayla Laundry",
    "address": "Jl. Lintas Timur km.35"
  },
  {
    "id": "alt-10",
    "name": "Zeva Laundry",
    "address": "Griya Sarjana Sejahtera"
  },
  {
    "id": "alt-11",
    "name": "Sanshan Laundry",
    "address": "Gang Buntu"
  },
  {
    "id": "alt-12",
    "name": "Laundry Mbak Vivin",
    "address": "Gang Lampung 2"
  },
  {
    "id": "alt-13",
    "name": "Azka Laundry",
    "address": "Permata Batu"
  },
  {
    "id": "alt-14",
    "name": "Silvy Laundry",
    "address": "Perum Griya Sejahtera"
  },
  {
    "id": "alt-15",
    "name": "Para Laundry",
    "address": "Samping Unsri"
  },
  {
    "id": "alt-16",
    "name": "Pasti Fresh Laundry",
    "address": "Gang Buntu"
  },
  {
    "id": "alt-17",
    "name": "Sahabat Laundry",
    "address": "Ruko Depan Alfamart Timbangan 32"
  },
  {
    "id": "alt-18",
    "name": "Express Pro Laundry",
    "address": "Jalan Lintas Timur Timbangan 32"
  },
  {
    "id": "alt-19",
    "name": "DMA Laundry",
    "address": "Jalan Indralaya Raya"
  },
  {
    "id": "alt-20",
    "name": "Rolansa Laundry",
    "address": "Komplek Persada"
  }
],
  respondents: [
  { "id": "resp-1", "name": "R" },
  { "id": "resp-2", "name": "Responden #2" },
  { "id": "resp-3", "name": "Revita Agustin" },
  { "id": "resp-4", "name": "Responden #4" },
  { "id": "resp-5", "name": "Muhammad Ridho Saputra" },
  { "id": "resp-6", "name": "Anis" },
  { "id": "resp-7", "name": "Fransisca Olivia" },
  { "id": "resp-8", "name": "marit" },
  { "id": "resp-9", "name": "Fanya Paulina" },
  { "id": "resp-10", "name": "Keiza Caroline" },
  { "id": "resp-11", "name": "Cici" },
  { "id": "resp-12", "name": "Responden #12" },
  { "id": "resp-13", "name": "Azizul manal Gaumalanga" },
  { "id": "resp-14", "name": "Shaula Kristiani" },
  { "id": "resp-15", "name": "Responden #15" },
  { "id": "resp-16", "name": "naysa" },
  { "id": "resp-17", "name": "adha" },
  { "id": "resp-18", "name": "Olin" },
  { "id": "resp-19", "name": "Geb" },
  { "id": "resp-20", "name": "Dea Arisa" },
  { "id": "resp-21", "name": "Nabila Dwi Putri" },
  { "id": "resp-22", "name": "Sartika" },
  { "id": "resp-23", "name": "Responden #23" },
  { "id": "resp-24", "name": "M. Irpan Arhandi" },
  { "id": "resp-25", "name": "Heru" },
  { "id": "resp-26", "name": "Mega Wati" },
  { "id": "resp-27", "name": "Responden #27" },
  { "id": "resp-28", "name": "Nabila Anggraini" },
  { "id": "resp-29", "name": "Revan" },
  { "id": "resp-30", "name": "Al" }
],
  alternativeValues: {
  "alt-1": {
    "c1": 4500,
    "c2": 6000,
    "c3": 10000,
    "c4": "800 m",
    "c5": "3 hari",
    "c6": 1,
    "c7": "08.00 - 18.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-2": {
    "c1": 4000,
    "c2": 5000,
    "c3": "-",
    "c4": "2000 m",
    "c5": "3 hari",
    "c6": 1,
    "c7": "07.00 - 21.30",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-3": {
    "c1": 4000,
    "c2": 6000,
    "c3": 10000,
    "c4": "2000 m",
    "c5": "3 hari",
    "c6": "-",
    "c7": "08.00 - 21.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-4": {
    "c1": "-",
    "c2": 6000,
    "c3": 10000,
    "c4": "3000 m",
    "c5": "3 hari",
    "c6": 2,
    "c7": "06.00 - 18.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-5": {
    "c1": 5000,
    "c2": 6000,
    "c3": 10000,
    "c4": "1500 m",
    "c5": "2 hari",
    "c6": 1,
    "c7": "08.00 - 18.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-6": {
    "c1": 6000,
    "c2": 7000,
    "c3": 20000,
    "c4": "2000 m",
    "c5": "3 hari",
    "c6": 3,
    "c7": "07.00 - 21.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-7": {
    "c1": 5000,
    "c2": 7000,
    "c3": 10000,
    "c4": "2000 m",
    "c5": "3 hari",
    "c6": 2,
    "c7": "08.00 - 21.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-8": {
    "c1": 6000,
    "c2": 7000,
    "c3": "-",
    "c4": "2500 m",
    "c5": "1 hari",
    "c6": 2,
    "c7": "07.00 - 20.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-9": {
    "c1": 4000,
    "c2": 4000,
    "c3": 12000,
    "c4": "4500 m",
    "c5": "3 hari",
    "c6": "-",
    "c7": "08.00 - 18.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-10": {
    "c1": 4500,
    "c2": 5000,
    "c3": "-",
    "c4": "3000 m",
    "c5": "3 hari",
    "c6": 2,
    "c7": "08.00 - 18.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-11": {
    "c1": 5000,
    "c2": 6000,
    "c3": 12000,
    "c4": "2000 m",
    "c5": "2 hari",
    "c6": 2,
    "c7": "09.00 - 18.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-12": {
    "c1": 5000,
    "c2": 6000,
    "c3": 10000,
    "c4": "450 m",
    "c5": "3 hari",
    "c6": 3,
    "c7": "07.00 - 21.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-13": {
    "c1": 6000,
    "c2": 7000,
    "c3": 10000,
    "c4": "3000m",
    "c5": "3 hari",
    "c6": 2,
    "c7": "08.00 - 21.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-14": {
    "c1": 5000,
    "c2": 6000,
    "c3": 15000,
    "c4": "2000 m",
    "c5": "3 hari",
    "c6": 3,
    "c7": "07.00 - 21.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-15": {
    "c1": 5000,
    "c2": 6000,
    "c3": 15000,
    "c4": "100 m",
    "c5": "2 hari",
    "c6": 3,
    "c7": "07.00 - 21.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-16": {
    "c1": 5000,
    "c2": 6000,
    "c3": 15000,
    "c4": "2000 m",
    "c5": "2 hari",
    "c6": 3,
    "c7": "07.00 - 21.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-17": {
    "c1": 5000,
    "c2": 6000,
    "c3": 12000,
    "c4": "2000 m",
    "c5": "2 hari",
    "c6": "-",
    "c7": "08.00 - 20.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-18": {
    "c1": 6000,
    "c2": 7000,
    "c3": 12000,
    "c4": "1000 m",
    "c5": "2 hari",
    "c6": 1,
    "c7": "08.00 - 20.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Ya"
  },
  "alt-19": {
    "c1": 4000,
    "c2": 6000,
    "c3": 12000,
    "c4": "5000 m",
    "c5": "3 hari",
    "c6": 2,
    "c7": "08.00 - 22.00",
    "c8": "Ya",
    "qris": "Ya",
    "c9": "Tidak"
  },
  "alt-20": {
    "c1": 5000,
    "c2": 7000,
    "c3": "-",
    "c4": "4500 m",
    "c5": "3 hari",
    "c6": 1,
    "c7": "07.00 - 21.00",
    "c8": "Tidak",
    "qris": "Ya",
    "c9": "Ya"
  }
},
  respondentScores: {
  "resp-1": {
    "c1": 3,
    "c2": 4,
    "c3": 2,
    "c4": 2,
    "c5": 2,
    "c6": 2,
    "c7": 2,
    "c8": 5,
    "c9": 3,
    "qris": 3
  },
  "resp-2": {
    "c1": 5,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 5,
    "c6": 5,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-3": {
    "c1": 3,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 4,
    "c6": 3,
    "c7": 3,
    "c8": 1,
    "c9": 5,
    "qris": 3
  },
  "resp-4": {
    "c1": 5,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 5,
    "c6": 5,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-5": {
    "c1": 5,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 5,
    "c6": 4,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-6": {
    "c1": 5,
    "c2": 4,
    "c3": 2,
    "c4": 3,
    "c5": 4,
    "c6": 3,
    "c7": 5,
    "c8": 2,
    "c9": 5,
    "qris": 3
  },
  "resp-7": {
    "c1": 5,
    "c2": 4,
    "c3": 5,
    "c4": 5,
    "c5": 5,
    "c6": 4,
    "c7": 4,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-8": {
    "c1": 3,
    "c2": 5,
    "c3": 5,
    "c4": 3,
    "c5": 1,
    "c6": 5,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-9": {
    "c1": 5,
    "c2": 3,
    "c3": 5,
    "c4": 4,
    "c5": 4,
    "c6": 3,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-10": {
    "c1": 5,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 5,
    "c6": 5,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-11": {
    "c1": 4,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 5,
    "c6": 4,
    "c7": 5,
    "c8": 4,
    "c9": 5,
    "qris": 3
  },
  "resp-12": {
    "c1": 5,
    "c2": 2,
    "c3": 1,
    "c4": 4,
    "c5": 4,
    "c6": 4,
    "c7": 2,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-13": {
    "c1": 3,
    "c2": 3,
    "c3": 3,
    "c4": 3,
    "c5": 5,
    "c6": 4,
    "c7": 5,
    "c8": 4,
    "c9": 4,
    "qris": 3
  },
  "resp-14": {
    "c1": 4,
    "c2": 4,
    "c3": 4,
    "c4": 5,
    "c5": 5,
    "c6": 3,
    "c7": 3,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-15": {
    "c1": 3,
    "c2": 3,
    "c3": 4,
    "c4": 4,
    "c5": 3,
    "c6": 4,
    "c7": 3,
    "c8": 5,
    "c9": 4,
    "qris": 3
  },
  "resp-16": {
    "c1": 4,
    "c2": 5,
    "c3": 5,
    "c4": 5,
    "c5": 2,
    "c6": 3,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-17": {
    "c1": 5,
    "c2": 5,
    "c3": 4,
    "c4": 4,
    "c5": 5,
    "c6": 5,
    "c7": 4,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-18": {
    "c1": 1,
    "c2": 5,
    "c3": 3,
    "c4": 4,
    "c5": 3,
    "c6": 3,
    "c7": 4,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-19": {
    "c1": 4,
    "c2": 3,
    "c3": 4,
    "c4": 5,
    "c5": 5,
    "c6": 4,
    "c7": 3,
    "c8": 2,
    "c9": 5,
    "qris": 3
  },
  "resp-20": {
    "c1": 4,
    "c2": 4,
    "c3": 4,
    "c4": 4,
    "c5": 3,
    "c6": 5,
    "c7": 3,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-21": {
    "c1": 3,
    "c2": 3,
    "c3": 5,
    "c4": 4,
    "c5": 5,
    "c6": 3,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-22": {
    "c1": 4,
    "c2": 4,
    "c3": 3,
    "c4": 4,
    "c5": 4,
    "c6": 3,
    "c7": 3,
    "c8": 4,
    "c9": 4,
    "qris": 3
  },
  "resp-23": {
    "c1": 5,
    "c2": 5,
    "c3": 1,
    "c4": 5,
    "c5": 5,
    "c6": 5,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-24": {
    "c1": 3,
    "c2": 3,
    "c3": 5,
    "c4": 5,
    "c5": 4,
    "c6": 3,
    "c7": 4,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-25": {
    "c1": 5,
    "c2": 5,
    "c3": 4,
    "c4": 5,
    "c5": 5,
    "c6": 5,
    "c7": 5,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-26": {
    "c1": 2,
    "c2": 4,
    "c3": 3,
    "c4": 3,
    "c5": 4,
    "c6": 4,
    "c7": 3,
    "c8": 4,
    "c9": 1,
    "qris": 3
  },
  "resp-27": {
    "c1": 3,
    "c2": 5,
    "c3": 4,
    "c4": 3,
    "c5": 4,
    "c6": 3,
    "c7": 4,
    "c8": 5,
    "c9": 5,
    "qris": 3
  },
  "resp-28": {
    "c1": 3,
    "c2": 4,
    "c3": 3,
    "c4": 3,
    "c5": 3,
    "c6": 4,
    "c7": 4,
    "c8": 3,
    "c9": 5,
    "qris": 3
  },
  "resp-29": {
    "c1": 5,
    "c2": 5,
    "c3": 3,
    "c4": 3,
    "c5": 4,
    "c6": 4,
    "c7": 3,
    "c8": 3,
    "c9": 5,
    "qris": 3
  },
  "resp-30": {
    "c1": 5,
    "c2": 2,
    "c3": 5,
    "c4": 5,
    "c5": 1,
    "c6": 5,
    "c7": 3,
    "c8": 3,
    "c9": 5,
    "qris": 3
  }
},
  options: { ...DEFAULT_GADA_OPTIONS },
};
