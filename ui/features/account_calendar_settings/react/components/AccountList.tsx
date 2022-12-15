/*
 * Copyright (C) 2022 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {useCallback, useEffect, useState} from 'react'

import {Flex} from '@instructure/ui-flex'
import {Img} from '@instructure/ui-img'
import {Spinner} from '@instructure/ui-spinner'
import {Text} from '@instructure/ui-text'

import {showFlashError} from '@canvas/alerts/react/FlashAlert'
import SpacePandaUrl from '@canvas/images/SpacePanda.svg'
import useDebouncedSearchTerm from '@canvas/search-item-selector/react/hooks/useDebouncedSearchTerm'
import useFetchApi from '@canvas/use-fetch-api-hook'
import {useScope as useI18nScope} from '@canvas/i18n'

import {AccountCalendarItem} from './AccountCalendarItem'
import {FilterType} from './FilterControls'
import {Account, VisibilityChange} from '../types'
import {castIdsToInt} from '../utils'
import {alertForMatchingAccounts} from '@canvas/calendar/AccountCalendarsUtils'

const I18n = useI18nScope('account_calendar_settings_account_list')

const MIN_SEARCH_TERM_LENGTH = 2
const PAGE_LENGTH_SEARCH = 20
const PAGE_LENGTH_FILTER = 100

type ComponentProps = {
  readonly originAccountId: number
  readonly searchValue: string
  readonly filterValue: FilterType
  readonly visibilityChanges: VisibilityChange[]
  readonly onAccountToggled: (id: number, visible: boolean) => void
}

// Doing this to avoid TS2339 errors-- remove once we're on InstUI 8
const {Item: FlexItem} = Flex as any

export const AccountList: React.FC<ComponentProps> = ({
  originAccountId,
  searchValue,
  filterValue,
  visibilityChanges,
  onAccountToggled,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setLoading] = useState(false)
  const {
    searchTerm: debouncedSearchTerm,
    setSearchTerm: setDebouncedSearchTerm,
    searchTermIsPending,
  } = useDebouncedSearchTerm('', {
    isSearchableTerm: term => term.length >= MIN_SEARCH_TERM_LENGTH || term.length === 0,
  })

  useEffect(() => {
    setDebouncedSearchTerm(searchValue)
  }, [searchValue, setDebouncedSearchTerm])

  useEffect(() => {
    if (!isLoading && accounts?.length >= 0) {
      alertForMatchingAccounts(accounts?.length, debouncedSearchTerm === '')
    }
  }, [isLoading, accounts, debouncedSearchTerm])

  // @ts-ignore - this hook isn't ts-ified
  useFetchApi({
    path: `/api/v1/accounts/${originAccountId}/account_calendars`,
    params: {
      search_term: debouncedSearchTerm,
      filter: filterValue === FilterType.SHOW_ALL ? '' : filterValue,
      per_page: debouncedSearchTerm ? PAGE_LENGTH_SEARCH : PAGE_LENGTH_FILTER,
    },
    success: useCallback(accountData => setAccounts(castIdsToInt(accountData)), []),
    error: useCallback(error => showFlashError(I18n.t('Unable to load results'))(error), []),
    loading: setLoading,
  })

  if (isLoading || searchTermIsPending) {
    return (
      <Flex as="div" alignItems="center" justifyItems="center" padding="x-large">
        <Spinner renderTitle={I18n.t('Loading accounts')} />
      </Flex>
    )
  }

  if (accounts.length === 0) {
    return (
      <Flex direction="column" alignItems="center" justifyItems="center" padding="xx-large medium">
        <FlexItem data-testid="empty-account-search" margin="0 0 medium">
          <Img src={SpacePandaUrl} />
        </FlexItem>
        <FlexItem>
          <Text size="x-large">{I18n.t('No results found')}</Text>
        </FlexItem>
        <FlexItem>
          <Text>
            {I18n.t('Please try another search term, filter, or search with fewer characters')}
          </Text>
        </FlexItem>
      </Flex>
    )
  }

  return accounts.map((account, index) => (
    <AccountCalendarItem
      key={`list_item_${account.id}`}
      item={account}
      visibilityChanges={visibilityChanges}
      onAccountToggled={onAccountToggled}
      padding="medium"
      showTopSeparator={index > 0}
    />
  ))
}
