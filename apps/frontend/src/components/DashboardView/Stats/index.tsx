import {
  useBorrowCapacity,
  useCollateralConfigurations,
  useMarketConfiguration,
  usePrice,
  useUserCollateralAssets,
  useUserSupplyBorrow,
} from '@/hooks';

import { Skeleton } from '@/components/ui/skeleton';
import { appConfig } from '@/configs';
import { MARKET_MODE, selectMarketMode, useMarketStore } from '@/stores';
import { formatUnits, getFormattedNumber, getFormattedPrice } from '@/utils';
import { useIsConnected } from '@fuels/react';
import BigNumber from 'bignumber.js';
import { Repeat } from 'lucide-react';
import { useMemo, useState } from 'react';
import { InfoBowl } from './InfoBowl';

export const Stats = () => {
  const [borrowedMode, setBorrowedMode] = useState(1); // 0: available to borrow, 1: borrowed
  const marketMode = useMarketStore(selectMarketMode);
  const { data: userSupplyBorrow, isPending: isPendingUserSupplyBorrow } =
    useUserSupplyBorrow();
  const { data: borrowCapacity } = useBorrowCapacity();
  const {
    data: userCollateralAssets,
    isPending: isPendingUserCollateralAssets,
  } = useUserCollateralAssets();
  const { data: priceData, isPending: isPendingPriceData } = usePrice();
  const { data: marketConfiguration, isPending: isPendingMarketConfiguration } =
    useMarketConfiguration();
  const {
    data: colateralConfigurations,
    isPending: isPendingCollateralConfigurations,
  } = useCollateralConfigurations();

  const isLoading = useMemo(() => {
    return [
      isPendingUserSupplyBorrow,
      isPendingUserCollateralAssets,
      isPendingPriceData,
      isPendingMarketConfiguration,
      isPendingCollateralConfigurations,
    ].some((res) => res);
  }, [
    isPendingUserSupplyBorrow,
    isPendingUserCollateralAssets,
    isPendingPriceData,
    isPendingMarketConfiguration,
    isPendingCollateralConfigurations,
  ]);

  const totalSuppliedBalance = useMemo(() => {
    if (
      !marketConfiguration ||
      !userSupplyBorrow ||
      !priceData ||
      !userCollateralAssets ||
      !colateralConfigurations
    ) {
      return BigNumber(0);
    }
    if (marketMode === 'lend') {
      return formatUnits(
        userSupplyBorrow.supplied,
        marketConfiguration.baseTokenDecimals
      );
    }

    if (marketMode === 'borrow') {
      return Object.entries(userCollateralAssets).reduce(
        (acc, [key, value]) => {
          return acc.plus(
            formatUnits(
              value.times(priceData.prices[key]),
              colateralConfigurations[key].decimals
            )
          );
        },
        new BigNumber(0)
      );
    }
  }, [
    userSupplyBorrow,
    userCollateralAssets,
    priceData,
    marketConfiguration,
    colateralConfigurations,
    marketMode,
  ]);

  const { isConnected } = useIsConnected();

  const borrowedBalanceText = useMemo(() => {
    if (
      !isConnected ||
      !borrowCapacity ||
      !userSupplyBorrow ||
      !marketConfiguration ||
      !priceData?.prices
    ) {
      return { title: '', value: 0 };
    }

    let updatedBorrowCapacity =
      borrowCapacity?.minus(
        BigNumber(1).div(
          priceData?.prices[marketConfiguration.baseToken.bits] ?? 1
        )
      ) ?? BigNumber(0);

    updatedBorrowCapacity = updatedBorrowCapacity.lt(0)
      ? BigNumber(0)
      : updatedBorrowCapacity;

    // Borrowed + Available to Borrow
    if (userSupplyBorrow.borrowed.gt(0)) {
      // Available to Borrow
      if (borrowedMode === 0) {
        if (updatedBorrowCapacity.lt(1) && updatedBorrowCapacity.gt(0)) {
          return { title: 'Available to Borrow', value: updatedBorrowCapacity };
        }
        return {
          title: 'Available to Borrow',
          value: updatedBorrowCapacity,
        };
      }
      // Borrowed
      const val = formatUnits(
        userSupplyBorrow.borrowed,
        marketConfiguration.baseTokenDecimals
      ).plus(
        BigNumber(0.001).div(
          priceData?.prices[marketConfiguration.baseToken.bits] ?? 1
        )
      );
      if (val.lt(1) && val.gt(0)) {
        return {
          title: 'Your Borrow Position',
          value: val,
        };
      }
      return {
        title: 'Your Borrow Position',
        value: val,
      };
    }
    // Available to borrow
    if (updatedBorrowCapacity.lt(1) && updatedBorrowCapacity.gt(0)) {
      return { title: 'Available to Borrow', value: updatedBorrowCapacity };
    }
    return {
      title: 'Available to Borrow',
      value: updatedBorrowCapacity,
    };
  }, [
    isConnected,
    borrowCapacity,
    userSupplyBorrow,
    borrowedMode,
    priceData,
    marketConfiguration,
  ]);

  return (
    <div className="w-full px-4 xl:px-[140px] 2xl:px-[203px]">
      <div className="flex w-full bg-card rounded-xl border-border border justify-between  items-center h-[91px] sm:h-[123px] px-[24px] sm:px-[56px]">
        <div className="w-[300px]">
          {isConnected && (
            <div>
              <div className="text-primary text-xs sm:text-md lg:text-lg font-semibold">
                {marketMode === MARKET_MODE.BORROW
                  ? 'Your Supplied Collateral'
                  : `Your Supplied ${appConfig.assets[marketConfiguration?.baseToken.bits ?? '']}`}
              </div>
              {isLoading ? (
                <Skeleton className="w-[60%] h-[25px] mt-2 sm:h-[40px] bg-primary/20" />
              ) : (
                <div className="text-lavender font-semibold text-lg sm:text-xl lg:text-2xl">
                  {getFormattedPrice(totalSuppliedBalance ?? BigNumber(0))}
                </div>
              )}
            </div>
          )}
        </div>
        <InfoBowl />
        <div className="w-[300px] text-right">
          {isConnected && userSupplyBorrow && marketMode === 'borrow' && (
            <div>
              <div className="text-primary flex items-center justify-end gap-x-1 text-xs sm:text-md lg:text-lg font-semibold">
                {borrowedBalanceText.title}
                {userSupplyBorrow.borrowed.gt(0) && (
                  <button
                    className=""
                    type="button"
                    onMouseDown={() => {
                      setBorrowedMode(borrowedMode === 0 ? 1 : 0);
                    }}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="w-full flex justify-end">
                  <Skeleton className="w-[60%] h-[25px] mt-2 sm:h-[40px] bg-primary/20" />
                </div>
              ) : (
                <div className="text-lavender font-semibold text-lg sm:text-xl lg:text-2xl">
                  {getFormattedPrice(BigNumber(borrowedBalanceText.value))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
