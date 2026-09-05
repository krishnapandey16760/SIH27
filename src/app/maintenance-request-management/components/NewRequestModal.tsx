'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { Loader2 } from 'lucide-react';

interface FormData {
  fromStation: string;
  toStation: string;
  lineType: string;
  dept: string;
  durationMins: number;
  preferredStart: string;
  preferredEnd: string;
  priority: string;
  requestedBy: string;
  notes: string;
}

const NR_STATIONS = [
  'NDLS', 'DLI', 'GZB', 'SBB', 'MTJ', 'AGC', 'ALD', 'CNB', 'LKO',
  'GKP', 'VNS', 'MGS', 'PNP', 'HW', 'KKDE', 'AMB', 'CDG', 'FZR',
];

export default function NewRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    setSubmitting(true);
    // Backend integration: POST /api/maintenance-requests { ...data, zone: 'NR', submittedAt: new Date() }
    setTimeout(() => {
      setSubmitting(false);
      toast.success(`Maintenance request submitted — MR-2026-${Math.floor(Math.random() * 9000 + 1000)}`);
      reset();
      onClose();
    }, 1400);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Maintenance Request" width={600}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Segment row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              From Station <span className="text-negative">*</span>
            </label>
            <select
              {...register('fromStation', { required: 'Required' })}
              className="select-field text-sm"
            >
              <option value="">Select station</option>
              {NR_STATIONS.map((s) => (
                <option key={`from-${s}`} value={s}>{s}</option>
              ))}
            </select>
            {errors.fromStation && (
              <p className="text-negative text-xs mt-1">{errors.fromStation.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              To Station <span className="text-negative">*</span>
            </label>
            <select
              {...register('toStation', { required: 'Required' })}
              className="select-field text-sm"
            >
              <option value="">Select station</option>
              {NR_STATIONS.map((s) => (
                <option key={`to-${s}`} value={s}>{s}</option>
              ))}
            </select>
            {errors.toStation && (
              <p className="text-negative text-xs mt-1">{errors.toStation.message}</p>
            )}
          </div>
        </div>

        {/* Line + Dept + Priority */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Line Type <span className="text-negative">*</span>
            </label>
            <select
              {...register('lineType', { required: 'Required' })}
              className="select-field text-sm"
            >
              <option value="">Select</option>
              <option value="UP">UP</option>
              <option value="DOWN">DOWN</option>
              <option value="BOTH">BOTH</option>
            </select>
            {errors.lineType && (
              <p className="text-negative text-xs mt-1">{errors.lineType.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Department <span className="text-negative">*</span>
            </label>
            <select
              {...register('dept', { required: 'Required' })}
              className="select-field text-sm"
            >
              <option value="">Select dept</option>
              <option value="Civil">Civil</option>
              <option value="OHE">OHE (Electrical)</option>
              <option value="S&T">S&T (Signalling)</option>
            </select>
            {errors.dept && (
              <p className="text-negative text-xs mt-1">{errors.dept.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Priority <span className="text-negative">*</span>
            </label>
            <select
              {...register('priority', { required: 'Required' })}
              className="select-field text-sm"
            >
              <option value="">Select</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            {errors.priority && (
              <p className="text-negative text-xs mt-1">{errors.priority.message}</p>
            )}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Requested Duration (minutes) <span className="text-negative">*</span>
          </label>
          <p className="text-2xs text-muted-foreground mb-1.5">
            Must be contiguous. Max 360 minutes (6 hours) per block.
          </p>
          <input
            type="number"
            min={30}
            max={360}
            step={15}
            {...register('durationMins', {
              required: 'Required',
              min: { value: 30, message: 'Minimum 30 minutes' },
              max: { value: 360, message: 'Maximum 360 minutes' },
            })}
            className="input-field text-sm"
            placeholder="e.g. 120"
          />
          {errors.durationMins && (
            <p className="text-negative text-xs mt-1">{errors.durationMins.message}</p>
          )}
        </div>

        {/* Preferred window */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Preferred Start <span className="text-negative">*</span>
            </label>
            <input
              type="time"
              {...register('preferredStart', { required: 'Required' })}
              className="input-field text-sm"
            />
            {errors.preferredStart && (
              <p className="text-negative text-xs mt-1">{errors.preferredStart.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Preferred End <span className="text-negative">*</span>
            </label>
            <input
              type="time"
              {...register('preferredEnd', { required: 'Required' })}
              className="input-field text-sm"
            />
            {errors.preferredEnd && (
              <p className="text-negative text-xs mt-1">{errors.preferredEnd.message}</p>
            )}
          </div>
        </div>

        {/* Requested by */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Requested By <span className="text-negative">*</span>
          </label>
          <input
            type="text"
            {...register('requestedBy', { required: 'Required' })}
            className="input-field text-sm"
            placeholder="Engineer name and designation"
          />
          {errors.requestedBy && (
            <p className="text-negative text-xs mt-1">{errors.requestedBy.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Work Description / Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="input-field text-sm resize-none"
            placeholder="Describe the maintenance work, equipment required, safety precautions…"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary text-sm" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}