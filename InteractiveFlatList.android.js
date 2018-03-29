import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  Animated,
  FlatList,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native'
import {
  NativeViewGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  PinchGestureHandler,
  State
} from 'react-native-gesture-handler'
import { getBoundaryOffset, parallelWithoutScaleAnimated, parallelAnimated } from './Utils'

export default class InteractiveFlatList extends Component {

  constructor(props) {
    super(props)
    this.AnimatedFlatList = null
    this.lastScale = 1
    this.focusPointX = 0
    this.isSingleReleasePan = true
    this.isDoubleReleasePan = true
    this.isSingleReleasePinch = true
    this.lastTranslationX = null
    this.lastTranslationY = null
    this.lastPointX = null
    this.lastPointY = null
    this.singleTapY = null
    this.doubleTapX = null
    this.doubleTapY = null
    this.focusPointX = null
    this.focusPointY = null
    this.isAnimated = false
    this.isSetSingleFocus = false
    this.isSetDoubleFocus = false
    this.animatedScale = new Animated.Value(1, { useNativeDriver: true })
    this.animatedOffsetX = new Animated.Value(0, { useNativeDriver: true })
    this.animatedOffsetY = new Animated.Value(0, { useNativeDriver: true })
    this.getBoundaryOffset = getBoundaryOffset.bind(this)
    this.parallelAnimated = parallelAnimated.bind(this)
    this.parallelWithoutScaleAnimated = parallelWithoutScaleAnimated.bind(this)
    this.enableTap
  }

  componentWillMount() {
    StatusBar.setHidden(true)
  }

  onFlatList = event => {
    if (event.nativeEvent.state === State.END && event.nativeEvent.oldState === State.ACTIVE) {
      this.enableTap = false
    } else {
      this.enableTap = true
    }
  }

  onDoubleTap = event => {
    if (event.nativeEvent.state === State.BEGAN) {
      this.doubleTapX = (event.nativeEvent.absoluteX - width/2)
      this.doubleTapY = (event.nativeEvent.absoluteY - height/2)
    }
    if (event.nativeEvent.state === State.ACTIVE) {
      const dx = this.doubleTapX - (event.nativeEvent.absoluteX - width/2)
      const dy = this.doubleTapY - (event.nativeEvent.absoluteY - height/2)
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 30) {
        this.isAnimated = true
        if (this.animatedScale._value ===  1 ) {
          const done = result => {
            if (result.finished) {
              this.lastScale = 2
              this.isAnimated = false
            }        
          }
          this.parallelAnimated({
            scale: 2,
            offsetX: -this.doubleTapX/2,
            offsetY: -this.doubleTapY/2,
            done: done
          })
        } else if (this.animatedScale._value > 1 ) {
          const done = result => {
            if (result.finished) {
              this.lastScale = 1
              this.isAnimated = false
            }        
          }
          this.parallelAnimated({
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            done: done
          })
        }
      }
    }
  }

  onSingleTap = event => {
    if (this.enableTap) {
      if (event.nativeEvent.state === State.BEGAN) {
        this.singleTapY = event.nativeEvent.absoluteY
      }
      if (this.animatedScale._value ===  1 && event.nativeEvent.state === State.ACTIVE) {
        if (this.singleTapY <= height/3) {
          this.props.onSingleClickTopArea && this.props.onSingleClickTopArea()
        } else if (this.singleTapY > height/3 && this.singleTapY < height*2/3) {
          this.props.onSingleClickMiddleArea && this.props.onSingleClickMiddleArea()
        } else {
          this.props.onSingleClickBottomArea && this.props.onSingleClickBottomArea()
        }    
      }
    }
  }

  onPanStart = event => {
    this.AnimatedFlatList.setNativeProps({scrollEnabled: false})
  }

  onPan = event => {
    if (event.nativeEvent.numberOfTouches === 2) {
      // 雙指平移
      if (this.isSingleReleasePan || this.isDoubleReleasePan) {
        this.isSingleReleasePan = false
        this.isDoubleReleasePan = false
        this.isSetSingleFocus = false
        
        if (this.isAnimated) {          
          this.animatedScale.stopAnimation(scaleValue => { 
            this.animatedOffsetX.stopAnimation(xValue => {
              this.animatedOffsetY.stopAnimation(yValue => {
                this.lastScale = scaleValue
                this.isAnimated = false
              })
            }) 
          })
        }
      }
      if (!this.isAnimated) {
        if (!this.isSetDoubleFocus) {
          this.isSetDoubleFocus = true
          this.focusPointX = (event.nativeEvent.absoluteX - width/2)/this.animatedScale._value - this.animatedOffsetX._value
          this.focusPointY = (event.nativeEvent.absoluteY - height/2)/this.animatedScale._value - this.animatedOffsetY._value
        }
        const magnifierCenterX = event.nativeEvent.absoluteX - width/2 // 目前雙手中心
        const magnifierCenterY = event.nativeEvent.absoluteY - height/2 // 目前雙手中心
        const offsetX = magnifierCenterX/this.animatedScale._value-this.focusPointX // 關注點到雙手中心需要的偏移量
        const offsetY = magnifierCenterY/this.animatedScale._value-this.focusPointY // 關注點到雙手中心需要的偏移量
        Animated.event(
          [{ offsetX: this.animatedOffsetX,
             offsetY: this.animatedOffsetY
          }]
        )({offsetX: offsetX,offsetY: offsetY})
      }
    } else {
      if (!(!this.isDoubleReleasePan && this.isSingleReleasePan)) {
        if (!this.isDoubleReleasePan && !this.isSingleReleasePan && !this.isAnimated) {
          this.releaseAnimated()
        }
        this.isDoubleReleasePan = false
        this.isSingleReleasePan = true
        this.isSetDoubleFocus = false
      }

      if (!this.isAnimated) {
        if (!this.isSetSingleFocus) {
          this.isSetSingleFocus = true
          this.lastTranslationX = this.animatedOffsetX._value
          this.lastTranslationY = this.animatedOffsetY._value
          this.lastPointX = event.nativeEvent.absoluteX
          this.lastPointY = event.nativeEvent.absoluteY
        }
        if (this.animatedScale._value > 1) {
          // 單指平移
          const diffX = (event.nativeEvent.absoluteX - this.lastPointX)/3
          const diffY = (event.nativeEvent.absoluteY - this.lastPointY)/3
          const offsetX = diffX + this.lastTranslationX
          const offsetY = diffY + this.lastTranslationY
          const offsetBoundaryX = (this.animatedScale._value*width/2-width/4)/this.animatedScale._value
          const offsetBoundaryY = (this.animatedScale._value*height/2-height/4)/this.animatedScale._value
          offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/(this.animatedScale._value*5)) : offsetX
          offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.animatedScale._value*1.5)) : offsetY
          Animated.event(
            [{ offsetX: this.animatedOffsetX,
               offsetY: this.animatedOffsetY
            }]
          )({offsetX: offsetX,offsetY: offsetY})
        }
      }
    }
  }

  onPanEnd = event => {
    this.isDoubleReleasePan = true
    this.isSingleReleasePan = true
    this.isSetSingleFocus = false
    this.isSetDoubleFocus = false
    //if (!this.isAnimated) {
      this.releaseAnimated()
    //}
  }

  onPinchStart = event => {
    this.AnimatedFlatList.setNativeProps({scrollEnabled: false})
  }

  onPinch = event => {
    if (!this.isAnimated) {
      if (event.nativeEvent.numberOfTouches === 2) {
        let scale = (event.nativeEvent.scale-1)+this.lastScale
        if (scale > 3) {
          scale = 3
        } else if (scale < 0.5) {
          scale = 0.5
        }
        Animated.event([{ scale: this.animatedScale}])({scale: scale})
      }
    }
  }

  onPinchEnd = event => {
    this.AnimatedFlatList.setNativeProps({scrollEnabled: true})
  }

  releaseAnimated = () => {
    this.isAnimated = true
    if (this.animatedScale._value < 1) {
      const done = result => {
        if (result.finished) {
          this.lastScale = 1
          this.isAnimated = false
        }        
      }
      this.parallelAnimated({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        done: done
      })
    } else if (this.animatedScale._value == 1) {
      const done = result => {
        if (result.finished) {
          this.lastScale = 1
          this.isAnimated = false
        }        
      }
      this.parallelWithoutScaleAnimated({
        offsetX: 0,
        offsetY: 0,
        done: done     
      })
    } else if (this.animatedScale._value > 1 && this.animatedScale._value <= 2) {
      const done = result => {
        if (result.finished) {
          this.lastScale = this.animatedScale._value
          this.isAnimated = false
        }        
      }
      const { offsetX, offsetY } = this.getBoundaryOffset(this.animatedScale._value)
      this.parallelWithoutScaleAnimated({
        offsetX: offsetX,
        offsetY: offsetY,
        done: done     
      })
    } else {
      const done = result => {
        if (result.finished) {
          this.lastScale = 2
          this.isAnimated = false
        }        
      }
      const { offsetX, offsetY } = this.getBoundaryOffset(2)
      this.parallelAnimated({
        scale: 2,
        offsetX: offsetX,
        offsetY: offsetY,
        done: done
      })     
    }    
  }

  getFlatList = () => {
    return(this.AnimatedFlatList.getNode())
  }

  render() {
    return (
      <View style={styles.comicbook}>
        <TapGestureHandler
          onHandlerStateChange={this.onSingleTap}
          waitFor={["double_tap","pinch","pan","flastlist"]}
          numberOfTaps={1}
        >
          <TapGestureHandler
            id="double_tap"
            onHandlerStateChange={this.onDoubleTap}
            numberOfTaps={2}
          >
            <PanGestureHandler
              id="pan"
              simultaneousHandlers="pinch"
              onActivated={this.onPanStart}
              onGestureEvent={this.onPan}
              minPointers={2}
              maxPointers={2}
              avgTouches
            >
              <PinchGestureHandler
                id="pinch"
                simultaneousHandlers="pan"
                onActivated={this.onPinchStart}
                onGestureEvent={this.onPinch}
                onEnded={this.onPinchEnd}
                enabled={true}
              >
                <NativeViewGestureHandler
                  id="flatlist"
                  onHandlerStateChange={this.onFlatList}
                >
                  <AnimatedFlatList
                    {...this.props}
                    ref={ref => this.AnimatedFlatList = ref}
                    style={{
                      transform: [
                        {scale: this.animatedScale},
                        {translateX: this.animatedOffsetX},
                        {translateY: this.animatedOffsetY}
                      ]
                    }}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    horizontal={false}
                  />
                </NativeViewGestureHandler>
              </PinchGestureHandler>
            </PanGestureHandler>
          </TapGestureHandler>
        </TapGestureHandler>
      </View>
    )
  }
}

InteractiveFlatList.propTypes = {
  data: PropTypes.array,
  renderItem: PropTypes.func.isRequired,
  onSingleClickTopArea: PropTypes.func,
  onSingleClickMiddleArea: PropTypes.func,
  onSingleClickBottomArea: PropTypes.func
}

InteractiveFlatList.defaultProps = {
  data: []
}

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

const styles = StyleSheet.create({
  comicbook: {
    flex: 1,
    backgroundColor: '#000000'
  }
})