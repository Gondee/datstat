import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/__tests__/mocks/react-helpers'
import userEvent from '@testing-library/user-event'
import CompanyFormModal from '@/components/admin/CompanyFormModal'
import { createMockCompany } from '@/__tests__/mocks/factories'

describe('CompanyFormModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Add Mode', () => {
    it('should render the modal in add mode', () => {
      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      expect(screen.getByText('Add New Company')).toBeInTheDocument()
      expect(screen.getByLabelText('Ticker Symbol *')).toBeInTheDocument()
      expect(screen.getByLabelText('Company Name *')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CompanyFormModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should validate required fields', async () => {
      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      const submitButton = screen.getByText('Add Company')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Ticker symbol is required')).toBeInTheDocument()
        expect(screen.getByText('Company name is required')).toBeInTheDocument()
        expect(screen.getByText('Description is required')).toBeInTheDocument()
        expect(screen.getByText('Sector is required')).toBeInTheDocument()
      })

      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValueOnce(undefined)

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      // Fill in basic info
      await user.type(screen.getByLabelText('Ticker Symbol *'), 'TEST')
      await user.type(screen.getByLabelText('Company Name *'), 'Test Company')
      await user.type(screen.getByLabelText('Description *'), 'A test company description')
      await user.type(screen.getByLabelText('Sector *'), 'Technology')
      await user.type(screen.getByLabelText('Market Cap *'), '1000000000')
      await user.type(screen.getByLabelText('Shares Outstanding *'), '100000000')

      // Switch to capital structure tab and fill required fields
      await user.click(screen.getByText('Capital Structure'))
      await user.type(screen.getByLabelText('Basic Shares *'), '100000000')

      // Switch to governance tab and fill required fields
      await user.click(screen.getByText('Governance'))
      await user.type(screen.getByLabelText('Board Size *'), '10')

      // Submit form
      await user.click(screen.getByText('Add Company'))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            ticker: 'TEST',
            name: 'Test Company',
            description: 'A test company description',
            sector: 'Technology',
            marketCap: 1000000000,
            sharesOutstanding: 100000000,
          })
        )
      })

      // Check success message
      await waitFor(() => {
        expect(screen.getByText('Company created successfully!')).toBeInTheDocument()
      })

      // Modal should close after delay
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('should handle save errors', async () => {
      const user = userEvent.setup()
      mockOnSave.mockRejectedValueOnce(new Error('Network error'))

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      // Fill minimum required fields
      await user.type(screen.getByLabelText('Ticker Symbol *'), 'TEST')
      await user.type(screen.getByLabelText('Company Name *'), 'Test Company')
      await user.type(screen.getByLabelText('Description *'), 'A test company')
      await user.type(screen.getByLabelText('Sector *'), 'Technology')
      await user.type(screen.getByLabelText('Market Cap *'), '1000000')
      await user.type(screen.getByLabelText('Shares Outstanding *'), '100000')

      await user.click(screen.getByText('Capital Structure'))
      await user.type(screen.getByLabelText('Basic Shares *'), '100000')

      await user.click(screen.getByText('Governance'))
      await user.type(screen.getByLabelText('Board Size *'), '5')

      await user.click(screen.getByText('Add Company'))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Edit Mode', () => {
    const mockCompany = createMockCompany({
      ticker: 'MSTR',
      name: 'MicroStrategy Inc.',
      businessModel: {
        revenueStreams: ['Software', 'Bitcoin Holdings'],
        operatingRevenue: 500000000,
        operatingExpenses: 400000000,
        cashBurnRate: 10000000,
        isTreasuryFocused: true,
        legacyBusinessValue: 1000000000,
      },
      capitalStructure: {
        sharesBasic: 10000000,
        sharesDilutedCurrent: 11000000,
        sharesDilutedAssumed: 12000000,
        sharesFloat: 8000000,
        sharesInsiderOwned: 2000000,
        sharesInstitutionalOwned: 5000000,
        weightedAverageShares: 10500000,
        convertibleDebt: [],
        warrants: [],
        stockOptions: 500000,
        restrictedStockUnits: 300000,
        performanceStockUnits: 200000,
      },
      governance: {
        boardSize: 7,
        independentDirectors: 5,
        ceoFounder: true,
        votingRights: '1 vote per share',
        auditFirm: 'PwC',
      },
    })

    it('should populate form with existing company data', () => {
      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          company={mockCompany}
          mode="edit"
        />
      )

      expect(screen.getByText('Edit MSTR')).toBeInTheDocument()
      expect(screen.getByLabelText('Ticker Symbol *')).toHaveValue('MSTR')
      expect(screen.getByLabelText('Ticker Symbol *')).toBeDisabled()
      expect(screen.getByLabelText('Company Name *')).toHaveValue('MicroStrategy Inc.')
    })

    it('should switch between tabs', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          company={mockCompany}
          mode="edit"
        />
      )

      // Check initial tab
      expect(screen.getByLabelText('Ticker Symbol *')).toBeInTheDocument()

      // Switch to business model tab
      await user.click(screen.getByText('Business Model'))
      expect(screen.getByLabelText('Revenue Streams')).toHaveValue('Software, Bitcoin Holdings')
      expect(screen.getByLabelText('Treasury-Focused Company')).toBeChecked()

      // Switch to capital structure tab
      await user.click(screen.getByText('Capital Structure'))
      expect(screen.getByLabelText('Basic Shares *')).toHaveValue(10000000)

      // Switch to governance tab
      await user.click(screen.getByText('Governance'))
      expect(screen.getByLabelText('Board Size *')).toHaveValue(7)
      expect(screen.getByLabelText('CEO is Company Founder')).toBeChecked()
    })

    it('should validate capital structure fields', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          company={mockCompany}
          mode="edit"
        />
      )

      // Switch to capital structure tab
      await user.click(screen.getByText('Capital Structure'))

      // Clear and set invalid values
      const dilutedSharesInput = screen.getByLabelText('Diluted Shares (Current)')
      await user.clear(dilutedSharesInput)
      await user.type(dilutedSharesInput, '5000000') // Less than basic shares

      // Try to submit
      await user.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(screen.getByText('Diluted shares must be >= basic shares')).toBeInTheDocument()
      })

      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should validate governance fields', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          company={mockCompany}
          mode="edit"
        />
      )

      // Switch to governance tab
      await user.click(screen.getByText('Governance'))

      // Set invalid values
      const independentDirectorsInput = screen.getByLabelText('Independent Directors')
      await user.clear(independentDirectorsInput)
      await user.type(independentDirectorsInput, '10') // More than board size

      // Try to submit
      await user.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(screen.getByText('Independent directors cannot exceed board size')).toBeInTheDocument()
      })

      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should close modal on cancel', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          company={mockCompany}
          mode="edit"
        />
      )

      await user.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should close modal on backdrop click', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          company={mockCompany}
          mode="edit"
        />
      )

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
      
      await user.click(backdrop!)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Form Interactions', () => {
    it('should convert ticker to uppercase', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      const tickerInput = screen.getByLabelText('Ticker Symbol *')
      await user.type(tickerInput, 'test')
      
      expect(tickerInput).toHaveValue('TEST')
    })

    it('should handle checkbox inputs', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      // Switch to business model tab
      await user.click(screen.getByText('Business Model'))

      const treasuryCheckbox = screen.getByLabelText('Treasury-Focused Company')
      expect(treasuryCheckbox).not.toBeChecked()

      await user.click(treasuryCheckbox)
      expect(treasuryCheckbox).toBeChecked()
    })

    it('should clear errors when fields are corrected', async () => {
      const user = userEvent.setup()

      render(
        <CompanyFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          mode="add"
        />
      )

      // Try to submit without required fields
      await user.click(screen.getByText('Add Company'))

      await waitFor(() => {
        expect(screen.getByText('Ticker symbol is required')).toBeInTheDocument()
      })

      // Fill in the ticker field
      await user.type(screen.getByLabelText('Ticker Symbol *'), 'TEST')

      // Error should be cleared
      expect(screen.queryByText('Ticker symbol is required')).not.toBeInTheDocument()
    })
  })
})