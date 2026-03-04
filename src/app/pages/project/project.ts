import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'project-crm',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, DragDropModule],
  templateUrl: './project.html',
  styleUrls: ['./project.scss']
})
export class ProjectComponent implements OnInit {
  selectedSector: string = 'ALL';
  searchQuery: string = '';
  loading: boolean = true;

  // Variable baru untuk simpan data statik (Elak kad hilang masa drag)
  groupedProjectsData: { key: string, value: any[] }[] = [];

  projects = [
    { id: 1, name: 'MOE School Refresh P1', client: 'MOE', sector: 'EDU', agents: 5000, deployed: 4200, balance: 800, assets: 5500, status: 'Active' },
    { id: 2, name: 'MINDEF Border Secure', client: 'MINDEF', sector: 'GOV', agents: 1200, deployed: 1150, balance: 50, assets: 1500, status: 'Active' },
    { id: 3, name: 'Petronas Digital HQ', client: 'Petronas', sector: 'GLC', agents: 3500, deployed: 3000, balance: 500, assets: 4000, status: 'Active' },
    { id: 4, name: 'Maybank Branch Ops', client: 'Maybank', sector: 'FSI', agents: 2200, deployed: 2100, balance: 100, assets: 3000, status: 'Active' },
    { id: 5, name: 'KWSP Infrastructure', client: 'KWSP', sector: 'GLC', agents: 900, deployed: 850, balance: 50, assets: 1000, status: 'Active' },
    { id: 6, name: 'LHDN System Upgrade', client: 'LHDN', sector: 'GOV', agents: 2800, deployed: 2000, balance: 800, assets: 3100, status: 'Warning' },
  ];

  constructor(private location: Location, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true;
    this.updateGroups(); // Panggil sekali masa awal load
    setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 1200);
  }

  // Handle Drag & Drop
 
  drop(event: CdkDragDrop<any[]>, sectorKey: string) {
    // 1. Ubah susunan kad dlm UI (data dlm container)
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

    // 2. Cari kedudukan (index) asal semua projek sektor ni dlm Master Array
    const originalIndices: number[] = [];
    this.projects.forEach((p, index) => {
      if (p.sector === sectorKey) {
        originalIndices.push(index);
      }
    });

    // 3. Masukkan balik data yang dah disusun mengikut index asal
    // Cara ni akan LOCK sektor tu supaya tak melompat ke atas/bawah dlm list!
    event.container.data.forEach((sortedItem, i) => {
      this.projects[originalIndices[i]] = sortedItem;
    });

    // 4. Update data view & trigger change detection
    this.updateGroups();
    this.cdr.detectChanges();
  }

  // FUNGSI BARU: Dipanggil bila user klik filter KPI
  setSector(sector: string) {
    this.selectedSector = sector;
    this.updateGroups();
  }

  // FUNGSI BARU: Update list tanpa guna getter
  updateGroups() {
    const filtered = this.projects.filter(p => {
      const matchSector = this.selectedSector === 'ALL' || p.sector === this.selectedSector;
      const matchSearch = p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                          p.client.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchSector && matchSearch;
    });

    const groupsObj = filtered.reduce((groups: { [key: string]: any[] }, project) => {
      const s = project.sector;
      if (!groups[s]) groups[s] = [];
      groups[s].push(project);
      return groups;
    }, {});

    // Tukar object jadi array siap-siap supaya HTML tak perlu guna pipe | keyvalue
    this.groupedProjectsData = Object.keys(groupsObj).map(k => ({
      key: k,
      value: groupsObj[k]
    }));
  }

  get sectorStats(): { [key: string]: number } {
    const getCount = (sector: string) => {
      const filtered = sector === 'ALL' ? this.projects : this.projects.filter(p => p.sector === sector);
      return new Set(filtered.map(p => p.client)).size;
    };
    return {
      ALL: getCount('ALL'), GOV: getCount('GOV'), GLC: getCount('GLC'), EDU: getCount('EDU'), FSI: getCount('FSI')
    };
  }

  goBack() { this.location.back(); }
}