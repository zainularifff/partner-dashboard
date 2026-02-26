import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IncidentApi } from '../../services/dashboard.api';

@Component({
  selector: 'app-brand-selector',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule, 
    MatTooltipModule, 
    RouterLink
  ],
  // ✅ DIBETULKAN: Nama fail mesti sebijik macam dkt sidebar VS Code kau
  templateUrl: './brand-selector.html', 
  styleUrls: ['./brand-selector.scss']
})
export class BrandSelectorComponent implements OnInit {
  otherBrands: any[] = [];
  filteredBrands: any[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  private readonly MAIN_BRANDS = ['ASUS', 'HP', 'LENOVO', 'ACER', 'DELL'];

  constructor(
    private api: IncidentApi,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOtherBrands();
  }

  loadOtherBrands(): void {
    this.isLoading = true;
    this.api.getBrandAging('').subscribe({
      next: (res: any[]) => {
        if (Array.isArray(res)) {
          this.otherBrands = res.filter(b => 
            !this.MAIN_BRANDS.includes(b.name.toUpperCase())
          );
          this.filteredBrands = [...this.otherBrands];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading other brands:', err);
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void {
    const search = this.searchTerm.toLowerCase().trim();
    if (!search) {
      this.filteredBrands = [...this.otherBrands];
    } else {
      this.filteredBrands = this.otherBrands.filter(b => 
        b.name.toLowerCase().includes(search)
      );
    }
    this.cdr.detectChanges();
  }

  selectBrand(brandName: string): void {
    if (!brandName) return;
    this.router.navigate(['/brand-breakdown', brandName]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}