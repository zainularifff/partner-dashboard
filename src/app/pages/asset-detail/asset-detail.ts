import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // ✅ Location untuk goBack
import { MatIconModule } from '@angular/material/icon';

// Interface untuk data supaya coding kau lebih tersusun
interface AssetRecord {
  ComputerName: string;
  Owner_Name: string;
  Location_Department: string;
  Machine_Type: string;
  IP: string;
  RAM: string | number;
  Full_CPU_Name: string;
  Manufacturer: string;
  Agent_Age_Days: number;
  Agent_Status: string;
}

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './asset-detail.html', // ✅ Pastikan file HTML kau sedia dngn table
  styleUrls: ['./asset-detail.scss']
})
export class AssetDetailComponent implements OnInit {
  selectedBrand = 'MIXED'; 
  selectedProject = 'FELDA';
  selectedType = 'Mixed Devices';

  // ✅ Data Real FELDA yang kau bagi
  assetDetails: AssetRecord[] = [
    { 
      ComputerName: "WIN-ELRN1F5306O", 
      Owner_Name: "TCO", 
      Location_Department: "Servers", 
      Machine_Type: "VMWare", 
      IP: "192.168.140.70", 
      RAM: "6 GB", 
      Full_CPU_Name: "Xeon Silver 4214 CPU", 
      Manufacturer: "VMware, Inc.", 
      Agent_Age_Days: 13, 
      Agent_Status: "Active" 
    },
    { 
      ComputerName: "PPROJEK-017", 
      Owner_Name: "NISA", 
      Location_Department: "TINGKAT 5\\P.PROJEK", 
      Machine_Type: "Desktop", 
      IP: "172.18.5.125", 
      RAM: "8 GB", 
      Full_CPU_Name: "Intel i5-4460 @ 3.20GHz", 
      Manufacturer: "Hewlett-Packard", 
      Agent_Age_Days: 59, 
      Agent_Status: "Active" 
    },
    { 
      ComputerName: "JKB-047", 
      Owner_Name: "AMIRA", 
      Location_Department: "TINGKAT 5\\BANGUNAN", 
      Machine_Type: "Desktop", 
      IP: "172.18.5.120", 
      RAM: "4 GB", 
      Full_CPU_Name: "Intel i7-4770 @ 3.40GHz", 
      Manufacturer: "Hewlett-Packard", 
      Agent_Age_Days: 62, 
      Agent_Status: "Active" 
    },
    { 
      ComputerName: "JPPK-010", 
      Owner_Name: "SITI AMINAH", 
      Location_Department: "TINGKAT 4\\JPPK", 
      Machine_Type: "Desktop", 
      IP: "172.18.4.190", 
      RAM: "8 GB", 
      Full_CPU_Name: "Intel i5-7400 @ 3.00GHz", 
      Manufacturer: "Acer", 
      Agent_Age_Days: 62, 
      Agent_Status: "Active" 
    },
    { 
      ComputerName: "KAUNTERHASIL-05", 
      Owner_Name: "KAUNTERHASIL-05", 
      Location_Department: "WSSB Unit BDM", 
      Machine_Type: "Desktop", 
      IP: "172.18.1.117", 
      RAM: "8 GB", 
      Full_CPU_Name: "Intel i5-1135G7 @ 2.40GHz", 
      Manufacturer: "ASUSTeK COMPUTER INC.", 
      Agent_Age_Days: 195, 
      Agent_Status: "Inactive" 
    },
    { 
      ComputerName: "JPPK-029", 
      Owner_Name: "AISYAH", 
      Location_Department: "TINGKAT 4\\JPPK", 
      Machine_Type: "Desktop", 
      IP: "172.18.4.176", 
      RAM: "8 GB", 
      Full_CPU_Name: "Intel i5-13400", 
      Manufacturer: "ASUSTeK COMPUTER INC.", 
      Agent_Age_Days: 59, 
      Agent_Status: "Active" 
    },
    { 
      ComputerName: "KEW-031", 
      Owner_Name: "RAHIM", 
      Location_Department: "TINGKAT 2\\KEWANGAN", 
      Machine_Type: "Desktop", 
      IP: "172.18.2.89", 
      RAM: "4 GB", 
      Full_CPU_Name: "Intel i5-2320 @ 3.00GHz", 
      Manufacturer: "Hewlett-Packard", 
      Agent_Age_Days: 59, 
      Agent_Status: "Active" 
    },
    { 
      ComputerName: "HASIL-007", 
      Owner_Name: "FARHANA", 
      Location_Department: "TINGKAT 1\\HASIL", 
      Machine_Type: "Desktop", 
      IP: "172.18.1.162", 
      RAM: "8 GB", 
      Full_CPU_Name: "Intel i5-9500 @ 3.00GHz", 
      Manufacturer: "ASUSTeK COMPUTER INC.", 
      Agent_Age_Days: 66, 
      Agent_Status: "Active" 
    }
  ];

  constructor(private location: Location) {} // ✅ Inject Location service

  ngOnInit(): void {
    console.log("Level 3 Initialized with Dummy Data");
  }

  // ✅ Fungsi goBack untuk setelkan ralat TS2339
  goBack(): void {
    this.location.back();
  }
}