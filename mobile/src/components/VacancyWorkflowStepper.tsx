import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import type { ReplacementStatus } from '../types/workforce';

interface VacancyWorkflowStepperProps {
  status: ReplacementStatus;
}

export default function VacancyWorkflowStepper({ status }: VacancyWorkflowStepperProps) {
  const s = useScaledStyles(styles);

  // Map replacement status to active step index
  // Steps: 0: Absent, 1: Requested, 2: Assigned, 3: Completed
  let activeStep = 0;
  if (status === 'requested') {
    activeStep = 1;
  } else if (status === 'assigned') {
    activeStep = 2;
  } else if (status === 'completed') {
    activeStep = 3;
  }

  const steps = [
    { label: 'Absent', icon: 'person-off' },
    { label: 'Requested', icon: 'campaign' },
    { label: 'Assigned', icon: 'person-add' },
    { label: 'Completed', icon: 'check-circle' }
  ];

  if (status === 'cancelled') {
    return (
      <View style={s.cancelledContainer}>
        <MaterialIcons name="cancel" size={20} color={Colors.dangerRed} style={s.cancelledIcon} />
        <Text style={s.cancelledText}>Replacement Request Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.stepperRow}>
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;
          const isUpcoming = idx > activeStep;

          return (
            <React.Fragment key={idx}>
              {/* Step indicator circle */}
              <View style={s.stepWrapper}>
                <View
                  style={[
                    s.circle,
                    isCompleted && s.circleCompleted,
                    isActive && s.circleActive,
                    isUpcoming && s.circleUpcoming
                  ]}
                >
                  {isCompleted ? (
                    <MaterialIcons name="check" size={14} color={Colors.onPrimary} />
                  ) : (
                    <MaterialIcons
                      name={step.icon as any}
                      size={14}
                      color={isActive ? Colors.primary : Colors.outline}
                    />
                  )}
                </View>
                <Text
                  style={[
                    s.label,
                    isCompleted && s.labelCompleted,
                    isActive && s.labelActive,
                    isUpcoming && s.labelUpcoming
                  ]}
                >
                  {step.label}
                </Text>
              </View>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <View
                  style={[
                    s.line,
                    idx < activeStep ? s.lineCompleted : s.lineUpcoming
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  circleCompleted: {
    backgroundColor: Colors.successGreen,
    borderColor: Colors.successGreen,
  },
  circleActive: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primary,
  },
  circleUpcoming: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.surfaceContainerHigh,
  },
  line: {
    height: 2,
    flex: 1,
    marginTop: -20, // Align vertically with circles
    marginHorizontal: -12,
  },
  lineCompleted: {
    backgroundColor: Colors.successGreen,
  },
  lineUpcoming: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  label: {
    ...Typography.labelSm,
    fontSize: 9,
    textAlign: 'center',
  },
  labelCompleted: {
    color: Colors.successGreen,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  labelUpcoming: {
    color: Colors.outline,
  },
  cancelledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorContainer,
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelledIcon: {
    marginRight: 6,
  },
  cancelledText: {
    ...Typography.bodyBold,
    color: Colors.onErrorContainer,
    fontSize: 12,
  },
});
