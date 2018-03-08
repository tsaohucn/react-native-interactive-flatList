import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  PanResponder,
  Platform,
  Animated,
  Easing,
  FlatList,
  Image,
  Dimensions,
  Button,
  InteractionManager
} from 'react-native'
import TimerMixin from 'react-timer-mixin'

const { width, height } = Dimensions.get('window')

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList)

export default class ComicBook extends Component {

  static propTypes = {
    ...View.propTypes,
    scalable: PropTypes.bool,
    content: PropTypes.array
  }

  static defaultProps = {
    scalable: true,
    content: new Array
  }

  constructor(props) {
    super(props)
    // 滾動
    this.state = {
      isScrollEnabled: true,
      animatedScale: new Animated.Value(1),
      animatedoffsetX: new Animated.Value(0),
      animatedoffsetY: new Animated.Value(0)
    }
    // Never Flag
    this.isNeverPinch = true
    this.isNeverTranslate = true
    this.isNeverSingleRelease = true
    this.isNeverPanResponderMove = true
    this.isNeverScaleSmall = true
    this.isNeverCountClick = true
    this.isNeverFingerTranslate = true
    // 縮放
    this.lastDistance = null
    this.focusPointX = 0 // 關注點Ｘ
    this.focusPointY = 0 // 關注點Ｙ
    //this.state.animatedScale = new Animated.Value(1)
    //this.state.animatedoffsetX = new Animated.Value(0)
    //this.state.animatedoffsetY = new Animated.Value(0)
    // 平移
    this.lastTranslateMoveX = null
    this.lastTranslateMoveY = null
    this.lastTranslateX = 0
    this.lastTranslateY = 0
    // 單擊 雙擊
    this.clickCount = 0
    this.singleFingerStayCount = 0
    this.clickX = null
    this.clickY = null
    this.singleClickX = null
    this.singleClickY = null
    this.scrollOffset = 0
    this.contentSize = null
    //
    this.isInAnimated = false
  }

  UNSAFE_componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      // Handler
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._onPanResponderRelease,
      onResponderTerminate : this._handlePanResponderTerminate,
      // Setter
      onStartShouldSetPanResponder: evt => !this.isInAnimated, // 開始觸碰，是否成為響應者
      onMoveShouldSetPanResponder: evt => !this.isInAnimated, // 開始移動，是否成為響應者
      //onStartShouldSetPanResponderCapture: evt => true, // 開始觸碰，是否捕捉成為響應者
      //onMoveShouldSetPanResponderCapture: evt => true,  // 開始移動，是否捕捉成為響應者
      onPanResponderTerminationRequest: evt => false, // 有其他響應者，是否釋放響應權
      onShouldBlockNativeResponder: evt => true // 返回一個布爾值，決定當前組件是否應該阻止原生組件成為JS響應者，默認返回true。目前暫時只支持android
    })
  }

  _handlePanResponderGrant = (e, gestureState) => { 
    if (e.nativeEvent.touches) {
      this.clickX = e.nativeEvent.touches[0].pageX
      this.clickY = e.nativeEvent.touches[0].pageY
    }
  }

  _handlePanResponderMove = (e, gestureState) => {
    this.isNeverPanResponderMove = false
    if (gestureState.numberActiveTouches === 2) {
      // 計算放大倍數 // 縮放時屏蔽滾動
      const dx = Math.abs(e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX)
      const dy = Math.abs(e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY)
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (!this.lastDistance) {
        //this.setState({isScrollEnabled: false})
        this.flatlist.setNativeProps({scrollEnabled: false})
        this.lastDistance = distance // 第一次lastDistance不存在給予把第一次的distance當作lastDistance
      }
      const scale = (1+(distance - this.lastDistance)/this.lastDistance)*this.state.animatedScale._value
      this.lastDistance = distance
      if (scale > 3) {
        scale = 3
      } else if (scale < 1) {
        this.isNeverScaleSmall = false
        if (scale < 0.5) {
          scale = 0.5
        }
      }
      // 計算偏移距離
      if (this.isNeverPinch) { 
        // 新一次雙手觸摸鎖定關注點 // 放大到縮小重置縮放 // 如果單手離開螢幕也算重置縮放
        this.focusPointX = ((e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2)/this.state.animatedScale._value - this.state.animatedoffsetX._value
        this.focusPointY = ((e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2)/this.state.animatedScale._value - this.state.animatedoffsetY._value
        this.isNeverPinch = false // 第一次縮放？
      }
      const magnifierCenterX = (e.nativeEvent.touches[0].pageX + e.nativeEvent.touches[1].pageX)/2 - width/2 // 目前雙手中心
      const magnifierCenterY = (e.nativeEvent.touches[0].pageY + e.nativeEvent.touches[1].pageY)/2 - height/2 // 目前雙手中心
      const offsetX = magnifierCenterX/scale-this.focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = magnifierCenterY/scale-this.focusPointY // 關注點到雙手中心需要的偏移量 
      if (scale >= 1 && this.isNeverScaleSmall) { 
        // 限制放大超過邊界時的偏移速度
        const offsetBoundaryX = (scale*width/2-width/2)/scale
        const offsetBoundaryY = (scale*height/2-height/2)/scale
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/scale) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(scale*1.5)) : offsetY
      }
      this._animation(offsetX,offsetY,scale,12)
      
    } else if (gestureState.numberActiveTouches === 1) {
      if (gestureState.dx === 0 && gestureState.dy === 0) {
        this.singleFingerStayCount += 1 // 單手停留
      } else {
        this.isNeverFingerTranslate = false // 移動過
      }
      if (!this.isNeverPinch && this.isNeverSingleRelease) {
        this.isNeverSingleRelease = false
        this._onPanResponderSingleRelease()
      } else if (this.state.animatedScale._value > 1 && Math.abs(gestureState.dx) > 0 && this.isNeverSingleRelease && this.isNeverPinch) {
        // 要平移一定要先放大 再釋放單手或雙手 平移 ? 要在動畫完成後才平移？
        if (this.isNeverTranslate) { // 第一次平移觸摸時平移量
          this.lastTranslateX = this.state.animatedoffsetX._value
          this.lastTranslateY = this.state.animatedoffsetY._value
          this.lastTranslateMoveX = gestureState.dx
          this.lastTranslateMoveY = gestureState.dy
          this.isNeverTranslate = false
        }
        const offsetBoundaryX = (this.state.animatedScale._value*width/2-width/2)/this.state.animatedScale._value
        const offsetBoundaryY = (this.state.animatedScale._value*height/2-height/2)/this.state.animatedScale._value
        const offsetX = this.lastTranslateX + (gestureState.dx - this.lastTranslateMoveX)/2
        const offsetY = this.lastTranslateY + (gestureState.dy - this.lastTranslateMoveY)/2
        offsetX = Math.abs(offsetX) >= offsetBoundaryX ? offsetBoundaryX*Math.sign(offsetX) + ((offsetX - offsetBoundaryX*Math.sign(offsetX))/this.state.animatedScale._value) : offsetX
        offsetY = Math.abs(offsetY) >= offsetBoundaryY ? offsetBoundaryY*Math.sign(offsetY) + ((offsetY - offsetBoundaryY*Math.sign(offsetY))/(this.state.animatedScale._value*1.5)) : offsetY
        this.state.animatedoffsetX.setValue(offsetX)
        this.state.animatedoffsetY.setValue(offsetY)        
      }
      
    }
   
  }
  
  // 全部釋放
  _onPanResponderRelease = (e, gestureState) => {
    if (this.isNeverPanResponderMove || (this.singleFingerStayCount === 1 && this.isNeverFingerTranslate)) {   
      this.isNeverPanResponderMove = true
      this.isNeverFingerTranslate = true
      this.singleFingerStayCount = 0
      if (this.isNeverCountClick) {
        this.isNeverCountClick = false // 如果是時間區間第一次點擊則屏蔽後面點擊
        this.singleClickX = this.clickX
        this.singleClickY = this.clickY
        this.timer = setTimeout(() => {
          if (this.clickCount > 0) {
            //this.setState({isScrollEnabled: false})
            this.isInAnimated = true
            this._resetFlag()
            this._handleDoubleClick(this.singleClickX,this.singleClickY)
          } else {
            this.isInAnimated = true
            this._resetFlag()
            this._handleSingleClick(this.singleClickY)
          }
        },200)
        //await this._sleep(200)

      } else {
        const dx = this.clickX - this.singleClickX
        const dy = this.clickY - this.singleClickY
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 100) {
          this.clickCount += 1
        }        
      }
    } else {
      // 滑動 縮放 釋放
      this.isNeverPanResponderMove = true
      this.isNeverFingerTranslate = true
      this.singleFingerStayCount = 0
      if (this.state.animatedScale._value > 2) {
        this._onPanResponderReleaseResetFlag()
        this._bigSpringBack(2)
      } else if (this.state.animatedScale._value >= 1 && this.state.animatedScale._value <= 2) {
        this._onPanResponderReleaseResetFlag()
        this._middleSpringBack(null)
      } else if (this.state.animatedScale._value < 1) {
        this._onPanResponderReleaseResetFlagSmall()
        this._smallSpringBack(1)
      }      
    }
  }

  // 單手釋放
  _onPanResponderSingleRelease = () => {
    if (this.state.animatedScale._value > 2) {
      this._onPanResponderSingleReleaseResetFlag()
      this._bigSpringBack(2)
    } else if (this.state.animatedScale._value > 1 && this.state.animatedScale._value <= 2) {
      this._onPanResponderSingleReleaseResetFlag()
      this._middleSpringBack(null)
    } else if (this.state.animatedScale._value <= 1) {
      this._onPanResponderSingleReleaseResetFlagSmall()
      this._smallSpringBack(1)
    }
  }

  _handlePanResponderTerminate =  (e, gestureState) => {
    //console.warn('意外取消')
  }

  _bigSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.state.animatedoffsetX,{
        toValue: this._springHideBlackBlock(scaleValue).offsetX,
        duration: 200
      }),
      Animated.timing(this.state.animatedoffsetY,{
        toValue: this._springHideBlackBlock(scaleValue).offsetY,
        duration: 200
      }),
      Animated.timing(this.state.animatedScale,{
        toValue: scaleValue,
        duration: 200
      })
    ]).start(() => {
      this.isInAnimated = false
    })
  }

  _middleSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.state.animatedoffsetX,{
        toValue: this._springHideBlackBlock(this.state.animatedScale._value).offsetX,
        duration: 200
      }),
      Animated.timing(this.state.animatedoffsetY,{
        toValue: this._springHideBlackBlock(this.state.animatedScale._value).offsetY,
        duration: 200
      })
    ]).start(() => {
      this.isInAnimated = false
    })
  }

  _smallSpringBack = (scaleValue,doneCallBack) => {
    Animated.parallel([
      Animated.timing(this.state.animatedScale,{
        toValue: scaleValue,
        duration: 200,
      }),
      Animated.timing(this.state.animatedoffsetX,{
        toValue: 0,
        duration: 200,
      }),
      Animated.timing(this.state.animatedoffsetY,{
        toValue: 0,
        duration: 200,
      })
    ]).start(() => {
      // 暫時修復BUG用，滾回原本位置
      this.flatlist.getNode().scrollToOffset({
        offset: this.scrollOffset,
        animated: true,
      })
      this.isInAnimated = false
    })
  }
  
  _animation = (offsetX,offsetY,scale) => {
    this.state.animatedoffsetX.setValue(offsetX)
    this.state.animatedoffsetY.setValue(offsetY)
    this.state.animatedScale.setValue(scale)   
  }

  _springHideBlackBlock = scale => {
    const offsetBoundaryX = (scale*width/2-width/2)/scale
    const offsetBoundaryY = (scale*height/2-height/2)/scale
    let offsetX = this.state.animatedoffsetX._value
    let offsetY = this.state.animatedoffsetY._value
    if (Math.abs(this.state.animatedoffsetX._value) > offsetBoundaryX) {
      offsetX = offsetBoundaryX*Math.sign(this.state.animatedoffsetX._value)
    }
    if (Math.abs(this.state.animatedoffsetY._value) > offsetBoundaryY) {
      offsetY = offsetBoundaryY*Math.sign(this.state.animatedoffsetY._value)
    }
    return {offsetX,offsetY}
  }

  _onPanResponderReleaseResetFlagSmall = () => {
    //this.setState({isScrollEnabled: true})
    this.flatlist.setNativeProps({scrollEnabled: true})
    this._onPanResponderReleaseResetFlag()
  }

  _onPanResponderReleaseResetFlag = () => {
    this.isNeverScaleSmall = true
    this._resetFlag()
  }

  _onPanResponderSingleReleaseResetFlagSmall = () => {
    //this.setState({isScrollEnabled: true})
    this.flatlist.setNativeProps({scrollEnabled: true})
    this._onPanResponderSingleReleaseResetFlag()
  }


  _onPanResponderSingleReleaseResetFlag = () => {
    this._resetFlag()
  }

  _resetFlag = () => {
    this.isNeverPinch = true
    this.isNeverTranslate = true
    this.isNeverSingleRelease = true
    this.lastDistance = null
    this.isInAnimated = true
  }

  _handleSingleClick = (pageY) => {
    if (pageY <= height/3) {
      const offsetY = (this.scrollOffset - height/3)
      if (offsetY < 0) {
        offsetY = 0
      }
      this.flatlist.getNode().scrollToOffset({
        offset: offsetY ,
        animated: true,
      })
    } else if (pageY > height/3 && pageY < height*2/3) {
      //console.warn('選單')
    } else {
      const offsetY = (this.scrollOffset + height/3)
      if (this.contentSize) {
        if (offsetY > this.contentSize) {
          offsetY = this.contentSize
        }
      }
      this.flatlist.getNode().scrollToOffset({
        offset: offsetY ,
        animated: true,
      })
    }
    this.timer && clearTimeout(this.timer)
    this.clickCount = 0
    this.isNeverCountClick = true
    this.isInAnimated = false
  }

  _handleDoubleClick = (pageX,pageY) => {
    if (this.state.animatedScale._value > 1) { 
      Animated.parallel([
        Animated.timing(this.state.animatedoffsetX,{
          toValue: 0,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: 0,
          duration: 200
        }),
        Animated.timing(this.state.animatedScale,{
          toValue: 1,
          duration: 200
        })
      ]).start(() => {
        //this.setState({isScrollEnabled: true})
        this.flatlist.setNativeProps({scrollEnabled: true})
        this.timer && clearTimeout(this.timer)
        this.clickCount = 0
        this.isNeverCountClick = true
        this.isInAnimated = false
      })
    } else if (this.state.animatedScale._value === 1) { 
      const focusPointX = (pageX - width/2)
      const focusPointY = (pageY - height/2)
      const offsetX = focusPointX/2-focusPointX // 關注點到雙手中心需要的偏移量
      const offsetY = focusPointY/2-focusPointY // 關注點到雙手中心需要的偏移量         
      Animated.parallel([
        Animated.timing(this.state.animatedoffsetX,{
          toValue: offsetX,
          duration: 200
        }),
        Animated.timing(this.state.animatedoffsetY,{
          toValue: offsetY,
          duration: 200
        }),
        Animated.timing(this.state.animatedScale,{
          toValue: 2,
          duration: 200
        })
      ]).start(() => {
        this.timer && clearTimeout(this.timer)
        this.clickCount = 0
        this.isNeverCountClick = true
        this.isInAnimated = false
      })
    }    
  }

  _sleep = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  _onScroll = ({nativeEvent}) => {
    //const {layoutMeasurement, scrollY, contentSize,contentOffset} = nativeEvent
    this.scrollOffset = nativeEvent.contentOffset.y
    this.contentSize = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height
  }

  render() {
    return (
      <AnimatedFlatList
        {...this.gestureHandlers.panHandlers}
        style={[styles.animatedFlatList,{
          transform: [
            {scaleX: this.state.animatedScale},
            {scaleY: this.state.animatedScale},
            {translateX: this.state.animatedoffsetX},
            {translateY: this.state.animatedoffsetY}
          ]
        }]}
        contentContainerStyle={styles.contentContainerStyle}
        ref={ref => this.flatlist = ref}
        removeClippedSubviews
        onEndReachedThreshold={0.1}
        data={this.props.content}
        numColumns={1}
        scrollEnabled={this.state.isScrollEnabled}
        showsVerticalScrollIndicator={false}
        horizontal={false}
        onScroll={this._onScroll}
        renderItem={({ item }) =>
          <Image
            resizeMode={'contain'} 
            style={{width, height: item.height, backgroundColor: 'black'}}
            source={{uri: item.key}}
            />
          }
      />
    )
  }
}

const styles = StyleSheet.create({
  animatedFlatList: {
    //
  },
  contentContainerStyle: {
    //justifyContent: 'center',
    //alignItems: 'center'
  }}
)