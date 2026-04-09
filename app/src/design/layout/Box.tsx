import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

interface BoxProps extends ViewProps {
  children?: React.ReactNode;
  gap?: number;
  backgroundColor?: string;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  margin?: number;
  alignItems?: ViewStyle['alignItems'];
  justifyContent?: ViewStyle['justifyContent'];
  flex?: number;
}

export const VerticalBox: React.FC<BoxProps> = ({ 
  children, 
  gap, 
  backgroundColor, 
  padding, 
  paddingHorizontal, 
  paddingVertical, 
  margin, 
  alignItems, 
  justifyContent, 
  flex, 
  style, 
  ...props 
}) => {
  const boxStyle: ViewStyle = {
    flexDirection: 'column',
    gap,
    backgroundColor,
    padding,
    paddingHorizontal,
    paddingVertical,
    margin,
    alignItems,
    justifyContent,
    flex,
  };

  return (
    <View style={[boxStyle, style]} {...props}>
      {children}
    </View>
  );
};

export const HorizontalBox: React.FC<BoxProps> = ({ 
  children, 
  gap, 
  backgroundColor, 
  padding, 
  paddingHorizontal, 
  paddingVertical, 
  margin, 
  alignItems, 
  justifyContent, 
  flex, 
  style, 
  ...props 
}) => {
  const boxStyle: ViewStyle = {
    flexDirection: 'row',
    gap,
    backgroundColor,
    padding,
    paddingHorizontal,
    paddingVertical,
    margin,
    alignItems: alignItems || 'center',
    justifyContent,
    flex,
  };

  return (
    <View style={[boxStyle, style]} {...props}>
      {children}
    </View>
  );
};
