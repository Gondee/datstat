import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDATStore } from '@/utils/store'
import { createMockCompany } from '@/__tests__/mocks/factories'
import { mockFetch, mockFetchError } from '@/__tests__/mocks/react-helpers'

// Mock zustand persist
vi.mock('zustand/middleware', () => ({
  persist: (config: any) => config,
}))

describe('DATStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useDATStore())
    act(() => {
      result.current.setCompanies([])
      result.current.clearComparison()
      result.current.updateFilters({
        searchQuery: '',
        cryptoFilter: [],
        sectorFilter: [],
        minTreasuryValue: 0,
        maxTreasuryValue: Number.MAX_SAFE_INTEGER,
      })
      result.current.setSorting('treasuryValue', 'desc')
    })
    vi.clearAllMocks()
  })

  describe('Company Management', () => {
    it('should set and filter companies', () => {
      const { result } = renderHook(() => useDATStore())
      
      const mockCompanies = [
        createMockCompany({
          ticker: 'MSTR',
          name: 'MicroStrategy',
          sector: 'Technology',
          metrics: { treasuryValue: 1000000000 } as any,
        }),
        createMockCompany({
          ticker: 'TSLA',
          name: 'Tesla',
          sector: 'Automotive',
          metrics: { treasuryValue: 500000000 } as any,
        }),
      ]

      act(() => {
        result.current.setCompanies(mockCompanies as any)
      })

      expect(result.current.companies).toHaveLength(2)
      expect(result.current.filteredCompanies).toHaveLength(2)
    })

    it('should filter companies by search query', () => {
      const { result } = renderHook(() => useDATStore())
      
      const mockCompanies = [
        createMockCompany({ ticker: 'MSTR', name: 'MicroStrategy' }),
        createMockCompany({ ticker: 'TSLA', name: 'Tesla' }),
        createMockCompany({ ticker: 'AAPL', name: 'Apple' }),
      ]

      act(() => {
        result.current.setCompanies(mockCompanies as any)
        result.current.updateFilters({ searchQuery: 'tes' })
      })

      expect(result.current.filteredCompanies).toHaveLength(1)
      expect(result.current.filteredCompanies[0].ticker).toBe('TSLA')
    })

    it('should filter companies by sector', () => {
      const { result } = renderHook(() => useDATStore())
      
      const mockCompanies = [
        createMockCompany({ ticker: 'MSTR', sector: 'Technology' }),
        createMockCompany({ ticker: 'TSLA', sector: 'Automotive' }),
        createMockCompany({ ticker: 'AAPL', sector: 'Technology' }),
      ]

      act(() => {
        result.current.setCompanies(mockCompanies as any)
        result.current.updateFilters({ sectorFilter: ['Technology'] })
      })

      expect(result.current.filteredCompanies).toHaveLength(2)
      expect(result.current.filteredCompanies.every(c => c.sector === 'Technology')).toBe(true)
    })

    it('should filter companies by treasury value range', () => {
      const { result } = renderHook(() => useDATStore())
      
      const mockCompanies = [
        createMockCompany({
          ticker: 'MSTR',
          metrics: { treasuryValue: 1000000000 } as any,
        }),
        createMockCompany({
          ticker: 'TSLA',
          metrics: { treasuryValue: 500000000 } as any,
        }),
        createMockCompany({
          ticker: 'AAPL',
          metrics: { treasuryValue: 100000000 } as any,
        }),
      ]

      act(() => {
        result.current.setCompanies(mockCompanies as any)
        result.current.updateFilters({
          minTreasuryValue: 200000000,
          maxTreasuryValue: 800000000,
        })
      })

      expect(result.current.filteredCompanies).toHaveLength(1)
      expect(result.current.filteredCompanies[0].ticker).toBe('TSLA')
    })
  })

  describe('Sorting', () => {
    it('should sort companies by treasury value', () => {
      const { result } = renderHook(() => useDATStore())
      
      const mockCompanies = [
        createMockCompany({
          ticker: 'A',
          metrics: { treasuryValue: 100 } as any,
        }),
        createMockCompany({
          ticker: 'B',
          metrics: { treasuryValue: 300 } as any,
        }),
        createMockCompany({
          ticker: 'C',
          metrics: { treasuryValue: 200 } as any,
        }),
      ]

      act(() => {
        result.current.setCompanies(mockCompanies as any)
        result.current.setSorting('treasuryValue', 'desc')
      })

      expect(result.current.filteredCompanies[0].ticker).toBe('B')
      expect(result.current.filteredCompanies[1].ticker).toBe('C')
      expect(result.current.filteredCompanies[2].ticker).toBe('A')

      act(() => {
        result.current.setSorting('treasuryValue', 'asc')
      })

      expect(result.current.filteredCompanies[0].ticker).toBe('A')
      expect(result.current.filteredCompanies[1].ticker).toBe('C')
      expect(result.current.filteredCompanies[2].ticker).toBe('B')
    })

    it('should sort companies by ticker alphabetically', () => {
      const { result } = renderHook(() => useDATStore())
      
      const mockCompanies = [
        createMockCompany({ ticker: 'TSLA' }),
        createMockCompany({ ticker: 'AAPL' }),
        createMockCompany({ ticker: 'MSTR' }),
      ]

      act(() => {
        result.current.setCompanies(mockCompanies as any)
        result.current.setSorting('ticker', 'asc')
      })

      expect(result.current.filteredCompanies[0].ticker).toBe('AAPL')
      expect(result.current.filteredCompanies[1].ticker).toBe('MSTR')
      expect(result.current.filteredCompanies[2].ticker).toBe('TSLA')
    })

    it('should toggle sort direction when same field is clicked', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.setSorting('ticker', 'asc')
      })
      expect(result.current.sortDirection).toBe('asc')

      act(() => {
        result.current.setSorting('ticker')
      })
      expect(result.current.sortDirection).toBe('desc')
    })
  })

  describe('Comparison List', () => {
    it('should add companies to comparison list', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToComparison('MSTR')
        result.current.addToComparison('TSLA')
      })

      expect(result.current.comparisonList).toEqual(['MSTR', 'TSLA'])
    })

    it('should not add duplicate companies to comparison', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToComparison('MSTR')
        result.current.addToComparison('MSTR')
      })

      expect(result.current.comparisonList).toEqual(['MSTR'])
    })

    it('should limit comparison list to 4 companies', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToComparison('A')
        result.current.addToComparison('B')
        result.current.addToComparison('C')
        result.current.addToComparison('D')
        result.current.addToComparison('E') // Should not be added
      })

      expect(result.current.comparisonList).toHaveLength(4)
      expect(result.current.comparisonList).not.toContain('E')
    })

    it('should remove companies from comparison list', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToComparison('MSTR')
        result.current.addToComparison('TSLA')
        result.current.removeFromComparison('MSTR')
      })

      expect(result.current.comparisonList).toEqual(['TSLA'])
    })

    it('should clear comparison list', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToComparison('MSTR')
        result.current.addToComparison('TSLA')
        result.current.clearComparison()
      })

      expect(result.current.comparisonList).toEqual([])
    })
  })

  describe('Watchlist', () => {
    it('should add and remove companies from watchlist', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToWatchlist('MSTR')
        result.current.addToWatchlist('TSLA')
      })

      expect(result.current.watchlist).toEqual(['MSTR', 'TSLA'])

      act(() => {
        result.current.removeFromWatchlist('MSTR')
      })

      expect(result.current.watchlist).toEqual(['TSLA'])
    })

    it('should not add duplicate companies to watchlist', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.addToWatchlist('MSTR')
        result.current.addToWatchlist('MSTR')
      })

      expect(result.current.watchlist).toEqual(['MSTR'])
    })
  })

  describe('API Integration', () => {
    it('should fetch companies successfully', async () => {
      const mockCompanies = [
        createMockCompany({ ticker: 'MSTR' }),
        createMockCompany({ ticker: 'TSLA' }),
      ]

      mockFetch({
        success: true,
        data: mockCompanies,
      })

      const { result } = renderHook(() => useDATStore())
      
      await act(async () => {
        await result.current.fetchCompanies()
      })

      expect(result.current.companies).toHaveLength(2)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.lastFetch).toBeInstanceOf(Date)
    })

    it('should handle fetch companies error', async () => {
      mockFetchError(new Error('Network error'))

      const { result } = renderHook(() => useDATStore())
      
      await act(async () => {
        await result.current.fetchCompanies()
      })

      expect(result.current.companies).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Network error')
    })

    it('should fetch individual company', async () => {
      const mockCompany = createMockCompany({ ticker: 'MSTR' })

      mockFetch({
        success: true,
        data: mockCompany,
      })

      const { result } = renderHook(() => useDATStore())
      
      let fetchedCompany
      await act(async () => {
        fetchedCompany = await result.current.fetchCompany('MSTR')
      })

      expect(fetchedCompany).toEqual(mockCompany)
      expect(result.current.companies).toHaveLength(1)
    })

    it('should update existing company when fetching', async () => {
      const { result } = renderHook(() => useDATStore())
      
      const initialCompany = createMockCompany({
        ticker: 'MSTR',
        name: 'MicroStrategy',
        marketCap: 1000000000,
      })

      act(() => {
        result.current.setCompanies([initialCompany] as any)
      })

      const updatedCompany = createMockCompany({
        ticker: 'MSTR',
        name: 'MicroStrategy',
        marketCap: 2000000000, // Updated market cap
      })

      mockFetch({
        success: true,
        data: updatedCompany,
      })

      await act(async () => {
        await result.current.fetchCompany('MSTR')
      })

      expect(result.current.companies).toHaveLength(1)
      expect(result.current.companies[0].marketCap).toBe(2000000000)
    })
  })

  describe('UI State', () => {
    it('should toggle view mode', () => {
      const { result } = renderHook(() => useDATStore())
      
      expect(result.current.viewMode).toBe('grid')

      act(() => {
        result.current.setViewMode('list')
      })

      expect(result.current.viewMode).toBe('list')
    })

    it('should set selected company', () => {
      const { result } = renderHook(() => useDATStore())
      
      act(() => {
        result.current.setSelectedCompany('MSTR')
      })

      expect(result.current.selectedCompany).toBe('MSTR')

      act(() => {
        result.current.setSelectedCompany(null)
      })

      expect(result.current.selectedCompany).toBeNull()
    })
  })
})