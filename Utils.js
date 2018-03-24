import { Animated, Dimensions } from 'react-native'

const { width, height } = Dimensions.get('window')

const duration = 200

function getBoundaryOffset(scale) {
  const offsetBoundaryX = (scale*width/2-width/2)/scale
  const offsetBoundaryY = (scale*height/2-height/2)/scale
  let offsetX = this.animatedOffsetX._value
  let offsetY = this.animatedOffsetY._value
  if (Math.abs(this.animatedOffsetX._value) > offsetBoundaryX) {
    offsetX = offsetBoundaryX*Math.sign(this.animatedOffsetX._value)
  }
  if (Math.abs(this.animatedOffsetY._value) > offsetBoundaryY) {
    offsetY = offsetBoundaryY*Math.sign(this.animatedOffsetY._value)
  }
  return {offsetX,offsetY}
}

function parallelWithoutScaleAnimated({offsetX,offsetY,done}) {
  Animated.parallel([
    Animated.timing(this.animatedOffsetX,{
      toValue: offsetX,
      duration: duration,
    }),
    Animated.timing(this.animatedOffsetY,{
      toValue: offsetY,
      duration: duration,
    })
  ]).start(done)
}

function parallelAnimated({scale,offsetX,offsetY,done}) {
  Animated.parallel([
    Animated.timing(this.animatedScale,{
      toValue: scale,
      duration: duration,
    }),
    Animated.timing(this.animatedOffsetX,{
      toValue: offsetX,
      duration: duration,
    }),
    Animated.timing(this.animatedOffsetY,{
      toValue: offsetY,
      duration: duration,
    })
  ]).start(done)
}

export { getBoundaryOffset, parallelWithoutScaleAnimated, parallelAnimated }