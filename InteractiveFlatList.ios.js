import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  Animated,
  FlatList,
  Dimensions,
  StatusBar,
  Text
} from 'react-native'
import {
  NativeViewGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  PinchGestureHandler,
  State
} from 'react-native-gesture-handler'

export default class InteractiveFlatList extends Component {

  constructor(props) {
    super(props)
    this.lastScale = 1
    this.focusPointX = 0
    this.scrollOffset = 0
    this.contentHeight = height
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
    this.animatedToolBarTopY = new Animated.Value(-50, { useNativeDriver: true })
    this.animatedToolBarBottomY = new Animated.Value(50, { useNativeDriver: true })
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
        if (this.animatedScale._value ===  1 ) {
          Animated.parallel([
            Animated.timing(this.animatedScale,{
              toValue: 2,
              duration: 200
            }),
            Animated.timing(this.animatedOffsetX,{
              toValue: -this.doubleTapX/2, // -A/2
              duration: 200
            }),
            Animated.timing(this.animatedOffsetY,{
              toValue: -this.doubleTapY/2, // -A/2
              duration: 200
            })
          ]).start(result => {
            if (result.finished) {
              this.lastScale = 2
            }          
          })
        } else if (this.animatedScale._value > 1 ) {
          Animated.parallel([
            Animated.timing(this.animatedScale,{
              toValue: 1,
              duration: 200
            }),
            Animated.timing(this.animatedOffsetX,{
              toValue: 0,
              duration: 200
            }),
            Animated.timing(this.animatedOffsetY,{
              toValue: 0,
              duration: 200
            })
          ]).start(result => {
            if (result.finished) {
              this.lastScale = 1
            }            
          })
        }
      }
    }
  }

  onSingleTap = event => {
    if (event.nativeEvent.state === State.BEGAN) {
      this.singleTapY = event.nativeEvent.absoluteY
    }
    if (this.animatedScale._value ===  1 && event.nativeEvent.state === State.ACTIVE) {
      if (this.singleTapY <= height/3) {
        this.props.onSingleClickTopArea && this.props.onSingleClickTopArea()
        /*
        const scrollOffset = this.scrollOffset - height/3 < 0 ? 0 : this.scrollOffset - height/3
        if (this.animatedToolBarTopY._value === 0 && this.animatedToolBarBottomY._value === 0) {
          Animated.parallel([
            Animated.timing(this.animatedToolBarTopY,{
              toValue: -50,
              duration: 200
            }),
            Animated.timing(this.animatedToolBarBottomY,{
              toValue: 50,
              duration: 200
            })
          ]).start()
        }
        this.flatlist.getNode().scrollToOffset({
          offset: scrollOffset,
          animated: true
        })
        */
      } else if (this.singleTapY > height/3 && this.singleTapY < height*2/3) {
        this.props.onSingleClickMiddleArea && this.props.onSingleClickMiddleArea()
        /*
        if (this.animatedToolBarTopY._value === 0 && this.animatedToolBarBottomY._value === 0) {
          Animated.parallel([
            Animated.timing(this.animatedToolBarTopY,{
              toValue: -50,
              duration: 200
            }),
            Animated.timing(this.animatedToolBarBottomY,{
              toValue: 50,
              duration: 200
            })
          ]).start()
        } else {
          Animated.parallel([
            Animated.timing(this.animatedToolBarTopY,{
              toValue: 0,
              duration: 200
            }),
            Animated.timing(this.animatedToolBarBottomY,{
              toValue: 0,
              duration: 200
            })
          ]).start()          
        }
        */
      } else {
        this.props.onSingleClickBottomArea && this.props.onSingleClickBottomArea()
        /*
        const scrollOffset = this.scrollOffset + height/3 > this.contentHeight ? this.contentHeight :this.scrollOffset + height/3
        if (this.animatedToolBarTopY._value === 0 && this.animatedToolBarBottomY._value === 0) {
          Animated.parallel([
            Animated.timing(this.animatedToolBarTopY,{
              toValue: -50,
              duration: 200,
            }),
            Animated.timing(this.animatedToolBarBottomY,{
              toValue: 50,
              duration: 200
            })
          ]).start() 
        }
        this.flatlist.getNode().scrollToOffset({
          offset: scrollOffset,
          animated: true
        })
        */
      }    
    }
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
          this.backAnimated()
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
    if (!this.isAnimated) {
      this.backAnimated()
    }
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

  backAnimated = () => {
    this.isAnimated = true
    if (this.animatedScale._value < 1) {
      Animated.parallel([
        Animated.timing(this.animatedScale,{
          toValue: 1,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetX,{
          toValue: 0,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetY,{
          toValue: 0,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = 1
          this.isAnimated = false
        }
      })
    } else if (this.animatedScale._value == 1) {
      Animated.parallel([
        Animated.timing(this.animatedOffsetX,{
          toValue: 0,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetY,{
          toValue: 0,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = 1
          this.isAnimated = false
        }       
      })
    } else if (this.animatedScale._value > 1 && this.animatedScale._value <= 2) {
      Animated.parallel([
        Animated.timing(this.animatedScale,{
          toValue: this.animatedScale._value,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetX,{
          toValue: this.springHideBlackBlock(this.animatedScale._value).offsetX,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetY,{
          toValue: this.springHideBlackBlock(this.animatedScale._value).offsetY,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = this.animatedScale._value
          this.isAnimated = false
        }
      })
    } else {
      Animated.parallel([
        Animated.timing(this.animatedScale,{
          toValue: 2,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetX,{
          toValue: this.springHideBlackBlock(2).offsetX,
          duration: 200,
        }),
        Animated.timing(this.animatedOffsetY,{
          toValue: this.springHideBlackBlock(2).offsetY,
          duration: 200,
        })
      ]).start(result => {
        if (result.finished) {
          this.lastScale = 2
          this.isAnimated = false
        }
      })      
    }    
  }

  springHideBlackBlock = scale => {
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

  onScrollBeginDrag = () => {
    if (this.animatedToolBarTopY._value === 0 && this.animatedToolBarBottomY._value === 0) {
      Animated.parallel([
        Animated.timing(this.animatedToolBarTopY,{
          toValue: -50,
          duration: 200,
        }),
        Animated.timing(this.animatedToolBarBottomY,{
          toValue: 50,
          duration: 200,
          })
      ]).start() 
    }
  }


  onScroll = ({nativeEvent}) => {
    this.scrollOffset = nativeEvent.contentOffset.y
    this.contentHeight = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height
  }

  renderTopToolBarLeftComponent = () => <View></View>

  renderTopToolBarRightComponent = () => <View></View>

  renderTopToolBarBottomComponent = () => <View></View>

  render() {
    return (
      <View style={styles.comicbook}>
        <TapGestureHandler
          onHandlerStateChange={this.onSingleTap}
          waitFor={["double_tap","flatlist_pinch","flatlist_pan"]}
          numberOfTaps={1}
          maxDurationMs={200}
        >
          <TapGestureHandler
            id="double_tap"
            waitFor={["flatlist_pinch","flatlist_pan"]}
            onHandlerStateChange={this.onDoubleTap}
            numberOfTaps={2}
          >
            <PanGestureHandler
              id="flatlist_pan"
              simultaneousHandlers="flatlist_pinch"
              waitFor="flatlist"
              //onActivated={this.onPanStart}
              onGestureEvent={this.onPan}
              onEnded={this.onPanEnd}
              minPointers={2}
              maxPointers={2}
              avgTouches
            >
              <PinchGestureHandler
                id="flatlist_pinch"
                simultaneousHandlers="flatlist_pan"
                onGestureEvent={this.onPinch}
                enabled={true}
              >
                <NativeViewGestureHandler
                  id="flatlist"
                >
                  <AnimatedFlatList
                    ref={ref => this.flatlist = ref}
                    style={{
                      transform: [
                        {scale: this.animatedScale},
                        {translateX: this.animatedOffsetX},
                        {translateY: this.animatedOffsetY}
                      ]
                    }}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={this.onScrollBeginDrag}
                    onScroll={this.onScroll}
                    data={this.props.data}
                    renderItem={this.props.renderItem}
                  />

                </NativeViewGestureHandler>
              </PinchGestureHandler>
            </PanGestureHandler>
          </TapGestureHandler>
        </TapGestureHandler>
        <StatusBar hidden />
    </View>
    )
  }
}

InteractiveFlatList.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array,
  renderItem: PropTypes.func.isRequired,
  onSingleClickTopArea: PropTypes.func,
  onSingleClickMiddleArea: PropTypes.func,
  onSingleClickBottomArea: PropTypes.func,
  //renderTopToolBarLeftComponent: PropTypes.func,
  //renderTopToolBarRightComponent: PropTypes.func,
  //renderTopToolBarBottomComponent: PropTypes.func
}

InteractiveFlatList.defaultProps = {
  title: '',
  data: [],
  renderItem: () => {},
  //renderTopToolBarLeftComponent: null,
  //renderTopToolBarRightComponent: null,
  //renderTopToolBarBottomComponent: null
}

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

const styles = {
  comicbook: {
    flex: 1,
    backgroundColor: '#000000'
  },
  topTool: {
    position: 'absolute', 
    top: 0,
    height: 50,
    width,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bottomTool: {
    position: 'absolute', 
    height: 50,
    width,
    backgroundColor: 'rgba(52, 52, 52, 0.8)',
    bottom: 0    
  },
  icon: {
    width: 30, 
    height: 30
  },
  text: {
    color: 'white'
  }
}