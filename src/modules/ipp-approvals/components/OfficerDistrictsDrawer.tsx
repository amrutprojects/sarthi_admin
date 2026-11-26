import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toastOk } from '../../../components/feedback/apiFeedback';
import { Callout } from '../../../components/ui';
import MultiSelectList, { type MultiSelectOption } from '../../../components/ui/MultiSelectList';
import { Drawer } from '../../../components/ui/Overlay';
import { useIppDistricts, useSetOfficerDistricts } from '../hooks/useIppApprovals';
import { plural } from '../labels';
import { officerDistrictsSchema, type OfficerDistrictsForm } from '../schemas/ippApprovalsSchema';
import type { DistrictWithoutOfficer, Officer } from '../types/ippApprovals.types';
import { errorText } from '../utils';

interface Props {
  officer: Officer;
  /* Every officer, to show who else a district is with (a district may have several). */
  officers: Officer[];
  withoutOfficer: DistrictWithoutOfficer[];
  onClose: () => void;
}

/* The districts of one Divisional Officer; saving replaces the whole list. */
export default function OfficerDistrictsDrawer({ officer, officers, withoutOfficer, onClose }: Props) {
  const districts = useIppDistricts();
  const save = useSetOfficerDistricts();
  const { control, handleSubmit, formState } = useForm<OfficerDistrictsForm>({
    resolver: zodResolver(officerDistrictsSchema),
    defaultValues: { districtIds: officer.districts.map((d) => d.id) },
  });

  const options: MultiSelectOption[] = useMemo(
    () =>
      (districts.data ?? []).map((d) => {
        const others = officers.filter((o) => o.id !== officer.id && o.isActive && o.districts.some((x) => x.id === d.id));
        const waiting = withoutOfficer.find((w) => w.id === d.id)?.waiting;
        const note = others.length
          ? `with ${others.map((o) => o.name).join(', ')}`
          : waiting
            ? `${plural(waiting, 'application')} waiting, no officer`
            : null;
        return { id: d.id, label: d.name, sub: d.code, note };
      }),
    [districts.data, officers, officer.id, withoutOfficer],
  );

  const submit = handleSubmit(({ districtIds }) =>
    save.mutate(
      { userId: officer.id, districtIds },
      {
        onSuccess: () => {
          toastOk(`Districts of ${officer.name} saved`);
          onClose();
        },
      },
    ),
  );

  return (
    <Drawer
      title={`Districts — ${officer.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={save.isPending || !districts.data} onClick={() => void submit()}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form noValidate aria-label={`Districts of ${officer.name}`} onSubmit={(e) => void submit(e)}>
        <p className="fs13 muted tw-mt-0">
          {officer.name} sees and decides the applications of the chosen districts, also those that already wait there.
        </p>
        {save.isError ? (
          <div className="mb10" role="alert">
            <Callout tone="err" title="Not saved. ">
              {errorText(save.error)}
            </Callout>
          </div>
        ) : null}
        <Controller
          control={control}
          name="districtIds"
          render={({ field }) => (
            <MultiSelectList
              id="officer-districts"
              label="Districts"
              noun="districts"
              options={options}
              saved={districts.data ? officer.districts.map((d) => ({ id: d.id, label: d.name })) : []}
              value={field.value}
              onChange={field.onChange}
              loading={districts.isPending}
              error={districts.isError ? errorText(districts.error) : null}
              onRetry={() => void districts.refetch()}
              emptyMsg="No active districts in the District Master."
              fieldError={formState.errors.districtIds?.message}
              disabled={save.isPending}
            />
          )}
        />
      </form>
    </Drawer>
  );
}
