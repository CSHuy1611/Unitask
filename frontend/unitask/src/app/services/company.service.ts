import { Injectable } from '@angular/core';
import { Company } from '../models/company.model';
import MOCK_COMPANIES from '../../assets/data/mock-companies.json';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private companies: Company[] = MOCK_COMPANIES as Company[];

  getAll(): Company[] {
    return this.companies;
  }

  getById(id: number): Company | undefined {
    return this.companies.find(c => c.id === id);
  }

  getTopCompanies(count: number = 6): Company[] {
    return [...this.companies].sort((a, b) => b.rating - a.rating).slice(0, count);
  }
}
