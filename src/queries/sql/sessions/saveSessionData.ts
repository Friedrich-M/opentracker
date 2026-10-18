import { DATA_TYPE, FIELD_LENGTH } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { flattenJSON, getStoredStringValue } from '@/lib/data';
import { truncateString } from '@/lib/format';
import prisma from '@/lib/prisma';
import type { DynamicData } from '@/lib/types';

interface SaveSessionDataArgs {
  websiteId: string;
  sessionId: string;
  sessionData: DynamicData;
  distinctId?: string;
  createdAt?: Date;
}

export async function saveSessionData(data: SaveSessionDataArgs) {
  return relationalQuery(data);
}

export async function relationalQuery({
  websiteId,
  sessionId,
  sessionData,
  distinctId,
  createdAt,
}: SaveSessionDataArgs) {
  const { writeRawQuery } = prisma;

  const jsonKeys = flattenJSON(sessionData);
  const normalizedDistinctId = truncateString(distinctId, FIELD_LENGTH.distinctId);

  const flattenedData = jsonKeys.map(a => ({
    id: uuid(),
    websiteId,
    sessionId,
    dataKey: truncateString(a.key, FIELD_LENGTH.dataKey),
    stringValue: getStoredStringValue(a.value, a.dataType),
    numberValue: a.dataType === DATA_TYPE.number ? a.value : null,
    dateValue: a.dataType === DATA_TYPE.date ? new Date(a.value) : null,
    dataType: a.dataType,
    distinctId: normalizedDistinctId,
    createdAt,
  }));

  for (const data of flattenedData) {
    const {
      id,
      websiteId,
      sessionId,
      dataKey,
      stringValue,
      numberValue,
      dateValue,
      dataType,
      distinctId,
      createdAt,
    } = data;

    await writeRawQuery(
      `
      insert into session_data (
        session_data_id,
        website_id,
        session_id,
        data_key,
        string_value,
        number_value,
        date_value,
        data_type,
        distinct_id,
        created_at
      )
      values (
        {{id}},
        {{websiteId}},
        {{sessionId}},
        {{dataKey}},
        {{stringValue}},
        {{numberValue}},
        {{dateValue}},
        {{dataType}},
        {{distinctId}},
        coalesce({{createdAt}}, now())
      )
      on conflict (session_id, data_key)
      do update set
        website_id = excluded.website_id,
        string_value = excluded.string_value,
        number_value = excluded.number_value,
        date_value = excluded.date_value,
        data_type = excluded.data_type,
        distinct_id = excluded.distinct_id,
        created_at = coalesce({{createdAt}}, session_data.created_at)
      `,
      {
        id,
        websiteId,
        sessionId,
        dataKey,
        stringValue,
        numberValue,
        dateValue,
        dataType,
        distinctId,
        createdAt,
      },
      'saveSessionData',
    );
  }
}
