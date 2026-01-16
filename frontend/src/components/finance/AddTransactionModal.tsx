import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { portfolioApi } from '@/api/portfolios';
import { assetApi } from '@/api/assets';
import { Portfolio, AssetSearchResult } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Search, Loader2, ArrowLeft, Check } from 'lucide-react';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: Portfolio;
  initialType?: 'BUY' | 'DEPOSIT';
  onSuccess: () => void;
}

export function AddTransactionModal({
  open,
  onOpenChange,
  portfolio,
  initialType = 'BUY',
  onSuccess,
}: AddTransactionModalProps) {
  // Use API's is_cash_portfolio field
  const isCashPortfolio = portfolio?.is_cash_portfolio || portfolio?.type === 'CASH' || portfolio?.type === 'SAVINGS';

  // Transaction type for cash portfolios
  const [cashType, setCashType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');

  // Transaction type for investment portfolios
  const [investmentType, setInvestmentType] = useState<'BUY' | 'SELL'>('BUY');

  // Step for investment transactions (1 = search, 2 = details)
  const [step, setStep] = useState(1);

  // Asset search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Transaction details
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Loading states
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceAutoFetched, setPriceAutoFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setCashType(initialType === 'DEPOSIT' ? 'DEPOSIT' : 'DEPOSIT');
      setInvestmentType(initialType === 'BUY' ? 'BUY' : 'SELL');
      setStep(1);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedAsset(null);
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setPrice('');
      setAmount('');
      setNotes('');
      setPriceAutoFetched(false);
      setError(null);
    }
  }, [open, initialType]);

  // Search for assets
  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    setError(null);
    try {
      const results = await assetApi.search(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search for assets');
    } finally {
      setSearching(false);
    }
  };

  // Select asset and fetch price
  const handleSelectAsset = async (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setSearchResults([]);
    setError(null);
    setStep(2);

    // Auto-fetch price for the transaction date
    setFetchingPrice(true);
    try {
      const response = await assetApi.getHistoricalPrice(asset.symbol, transactionDate);
      setPrice(response.price.toFixed(2));
      setPriceAutoFetched(true);
    } catch (err) {
      console.error('Failed to fetch price:', err);
      setPriceAutoFetched(false);
    } finally {
      setFetchingPrice(false);
    }
  };

  // Handle date change for investment transactions
  const handleDateChange = async (date: string) => {
    setTransactionDate(date);
    if (!date || !selectedAsset) return;

    setFetchingPrice(true);
    try {
      const response = await assetApi.getHistoricalPrice(selectedAsset.symbol, date);
      setPrice(response.price.toFixed(2));
      setPriceAutoFetched(true);
    } catch (err) {
      console.error('Failed to fetch historical price:', err);
      setPriceAutoFetched(false);
    } finally {
      setFetchingPrice(false);
    }
  };

  // Handle price change (user override)
  const handlePriceChange = (value: string) => {
    setPrice(value);
    setPriceAutoFetched(false);
  };

  // Submit transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isCashPortfolio) {
        // DEPOSIT or WITHDRAWAL for cash portfolios
        await portfolioApi.createTransaction(portfolio.id, {
          transaction_type: cashType,
          total_amount: parseFloat(amount),
          currency: portfolio.currency,
          transaction_date: transactionDate,
          notes,
        });
      } else {
        // BUY or SELL for investment portfolios
        if (!selectedAsset) {
          setError('Please select an asset');
          setSubmitting(false);
          return;
        }
        await portfolioApi.createTransaction(portfolio.id, {
          symbol: selectedAsset.symbol,
          transaction_type: investmentType,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          total_amount: parseFloat(quantity) * parseFloat(price),
          currency: portfolio.currency,
          transaction_date: transactionDate,
          notes,
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to add transaction';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Go back to asset search
  const handleBack = () => {
    setStep(1);
    setSelectedAsset(null);
    setPrice('');
    setPriceAutoFetched(false);
    setQuantity('');
    setError(null);
  };

  // Calculate total for investment transactions
  const calculatedTotal = quantity && price ? parseFloat(quantity) * parseFloat(price) : 0;

  // Render cash transaction form
  const renderCashForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={cashType === 'DEPOSIT' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCashType('DEPOSIT')}
        >
          Deposit
        </Button>
        <Button
          type="button"
          variant={cashType === 'WITHDRAWAL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCashType('WITHDRAWAL')}
        >
          Withdrawal
        </Button>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium">Date</label>
          <Input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Amount ({portfolio.currency})</label>
          <Input
            type="number"
            step="0.01"
            placeholder="1000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Notes (optional)</label>
          <Input
            placeholder="e.g., Monthly savings"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !amount}>
          {submitting ? 'Adding...' : `Add ${cashType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}`}
        </Button>
      </div>
    </form>
  );

  // Render investment transaction form
  const renderInvestmentForm = () => {
    if (step === 1) {
      // Step 1: Asset Search
      return (
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <div className="flex-1 h-1 bg-muted rounded" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
              2
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={investmentType === 'BUY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvestmentType('BUY')}
            >
              Buy
            </Button>
            <Button
              type="button"
              variant={investmentType === 'SELL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvestmentType('SELL')}
            >
              Sell
            </Button>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Search for Asset</label>
            <div className="flex gap-2">
              <Input
                placeholder="Search for a stock, ETF, or fund..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              />
              <Button type="button" onClick={handleSearch} disabled={searching || searchQuery.length < 2}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {searchResults.slice(0, 10).map((result) => (
                <button
                  key={result.symbol}
                  type="button"
                  className="w-full p-3 text-left hover:bg-muted flex justify-between items-center"
                  onClick={() => handleSelectAsset(result)}
                >
                  <div>
                    <div className="font-medium">{result.symbol}</div>
                    <div className="text-sm text-muted-foreground">{result.name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{result.exchange}</div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // Step 2: Transaction Details
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-medium">
            <Check className="h-4 w-4" />
          </div>
          <div className="flex-1 h-1 bg-primary rounded" />
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            2
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Selected asset display */}
        {selectedAsset && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
            <div className="flex-1">
              <div className="font-medium">{selectedAsset.symbol}</div>
              <div className="text-sm text-muted-foreground">{selectedAsset.name}</div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Change
            </Button>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <Button
            type="button"
            variant={investmentType === 'BUY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInvestmentType('BUY')}
          >
            Buy
          </Button>
          <Button
            type="button"
            variant={investmentType === 'SELL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInvestmentType('SELL')}
          >
            Sell
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Transaction Date</label>
            <Input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={transactionDate}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              step="any"
              placeholder="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            Price per Share
            {priceAutoFetched && (
              <span className="text-xs text-muted-foreground ml-2">(auto-fetched)</span>
            )}
          </label>
          <div className="relative">
            <Input
              type="number"
              step="any"
              placeholder="29.50"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              disabled={fetchingPrice}
              required
            />
            {fetchingPrice && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {calculatedTotal > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-lg font-semibold">
              {formatCurrency(calculatedTotal, portfolio.currency)}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Notes (optional)</label>
          <Input
            placeholder="e.g., Regular investment"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || fetchingPrice || !quantity || !price}>
              {submitting ? 'Adding...' : `Add ${investmentType} Transaction`}
            </Button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isCashPortfolio
              ? `Add ${cashType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}`
              : step === 1
              ? 'Select Asset'
              : `Add ${investmentType} Transaction`}
          </DialogTitle>
        </DialogHeader>

        {isCashPortfolio ? renderCashForm() : renderInvestmentForm()}
      </DialogContent>
    </Dialog>
  );
}
