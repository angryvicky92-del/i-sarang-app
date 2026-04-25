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

/**
 * Box component that handles spacing without relying on the native 'gap' property,
 * ensuring maximum compatibility across all React Native / Expo versions.
 */
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
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        if (index === 0 || !gap) return child;
        
        // Apply top margin to all children except the first one to simulate gap
        const existingStyle = (child.props as any).style;
        return React.cloneElement(child, {
          style: [existingStyle, { marginTop: gap }]
        } as any);
      })}
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
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        if (index === 0 || !gap) return child;
        
        // Apply left margin to all children except the first one to simulate gap
        const existingStyle = (child.props as any).style;
        return React.cloneElement(child, {
          style: [existingStyle, { marginLeft: gap }]
        } as any);
      })}
    </View>
  );
};
